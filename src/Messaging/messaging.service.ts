import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { YellowService } from '../Yellow/yellow.service';
import { SendMessageDto } from './dto/messaging.dto';
import { SupabaseService } from '../supabase/supabase.service';

export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  txHash?: string;
  is_read?: boolean;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  
  // Costo por mensaje: 0.0001 USDC
  private readonly MESSAGE_PRICE_USDC = ethers.parseUnits("0.0001", 6);

  constructor(
    private readonly yellowService: YellowService,
    private readonly supabaseService: SupabaseService
  ) {}

  /**
   * PROCESA MENSAJE + PAGO + BD
   */
  async processMessage(sender: string, dto: SendMessageDto) {
    const supabase = this.supabaseService.getClient();
    this.logger.log(`📩 Processing ${dto.content} from ${sender} to ${dto.to}`);

    // 1. VERIFICAR PAGO (Off-Chain Signature)
    const serverSignature = await this.yellowService.validateAndSignState(dto.channelState, BigInt(this.MESSAGE_PRICE_USDC));

    // 2. PERSISTIR ESTADO DEL CANAL (Evitar pérdida de fondos)
    const { error: channelError } = await supabase
      .from('payment_channels')
      .upsert({
        channel_id: dto.channelState.channelId,
        user_address: sender.toLowerCase(),
        nonce: dto.channelState.nonce,
        user_balance: dto.channelState.userBalance, // New Balance
        server_balance: dto.channelState.serverBalance,
        last_signature: dto.channelState.signature, // User Signature
        updated_at: new Date().toISOString()
      });

    if (channelError) {
       this.logger.error(`Failed to save channel state: ${channelError.message}`);
       // Continue anyway? For hackathon yes, but risky.
    }

    // 3. LOGICA MENSAJE CON REFERENCE A CONVERSATION
    // 3.1 Asegurar Participantes en 'users' para guardar ENS
    const sAddr = sender.toLowerCase();
    const rAddr = dto.to.toLowerCase();
    
    // Upsert Sender & Receiver (Ignoramos error si falla por concurrencia)
    // Supabase upsert no lanza excepción, devuelve { error }. Al no leerlo, lo ignoramos.
    await supabase.from('users').upsert({ wallet_address: sAddr, username: dto.senderEns || null });
    await supabase.from('users').upsert({ wallet_address: rAddr, username: dto.receiverEns || null });

    // 3.2 Obtener/Crear Conversation ID
    const [p1, p2] = sAddr < rAddr ? [sAddr, rAddr] : [rAddr, sAddr];
    let convId: string;

    const { data: existConv } = await supabase
        .from('conversations')
        .select('conversation_id')
        .eq('participant1', p1)
        .eq('participant2', p2)
        .single();

    if (existConv) {
        convId = existConv.conversation_id;
    } else {
        const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({ participant1: p1, participant2: p2 })
            .select('conversation_id')
            .single();
        if (createError) throw new Error(`Failed to create conv: ${createError.message}`);
        convId = newConv.conversation_id;
    }

    // 3.3 Insertar Mensaje con conversation_id
    const { data: insertedMsg, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        sender: sAddr,
        receiver: rAddr,
        content: dto.content,
      })
      .select()
      .single();

    if (msgError) {
        this.logger.error(`DB Error: ${msgError.message}`);
        throw new Error(`DB Error: ${msgError.message}`);
    }

    const savedMessage: ChatMessage = {
      id: insertedMsg.message_id,
      from: insertedMsg.sender,
      to: insertedMsg.receiver,
      content: insertedMsg.content,
      timestamp: new Date(insertedMsg.sent_at).getTime(),
    };

    this.logger.log(`✅ Message saved. DB_ID: ${savedMessage.id}`);

    return {
      success: true,
      message: savedMessage,
      serverSignature, 
    };
  }

  /**
   * Obtiene historial DB (Usando Conversation ID)
   */
  async getHistory(user1: string, user2: string) {
    const supabase = this.supabaseService.getClient();
    const u1 = user1.toLowerCase();
    const u2 = user2.toLowerCase();
    
    // Buscar conversacion
    const [p1, p2] = u1 < u2 ? [u1, u2] : [u2, u1];
    
    const { data: conv } = await supabase
        .from('conversations')
        .select('conversation_id')
        .eq('participant1', p1)
        .eq('participant2', p2)
        .single();
        
    if (!conv) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.conversation_id)
      .order('sent_at', { ascending: true });

    if (error) {
        this.logger.error(error);
        return [];
    }

    // Map DB format to ChatMessage
    return data.map(m => ({
        id: m.message_id,
        from: m.sender,
        to: m.receiver,
        content: m.content,
        timestamp: new Date(m.sent_at).getTime(),
    }));
  }

  /**
   * Obtiene la lista de conversaciones usando la tabla 'conversations'
   */
  async getConversations(myAddress: string) {
      if (!myAddress) return [];
      const supabase = this.supabaseService.getClient();
      const me = myAddress.toLowerCase();
      
      this.logger.log(`🔍 Fetching conversations for ${me}`);

      // Obtener IDs de conversaciones donde soy participante
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1.eq.${me},participant2.eq.${me}`);
      
      if (error || !convs) {
          return [];
      }
      
      const results: any[] = [];
      
      for (const c of convs) {
          // Identify peer
          const peer = c.participant1 === me ? c.participant2 : c.participant1;
          
          // Get last message for preview
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', c.conversation_id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single();

          // Get Peer Info (ENS)
          const { data: peerUser } = await supabase
             .from('users')
             .select('username')
             .eq('wallet_address', peer)
             .single();
            
          if (lastMsg) {
              results.push({
                  peerAddress: peer,
                  peerEns: peerUser?.username,
                  lastMessage: lastMsg.content,
                  timestamp: new Date(lastMsg.sent_at).getTime(),
                  unreadCount: 0
              });
          }
      }
      
      return results;
  }

  // --- ONLINE STATUS ---

  async setUserOnline(address: string) {
      if (!address) return;
      await this.supabaseService.getClient()
          .from('users')
          .upsert({ address: address.toLowerCase(), is_online: true, last_seen: new Date().toISOString() });
  }

  async setUserOffline(address: string) {
      if (!address) return;
      await this.supabaseService.getClient()
          .from('users')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('address', address.toLowerCase());
  }
}
