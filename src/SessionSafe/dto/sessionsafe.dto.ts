export class DepositDto {
  amount: string;
}

export class SettleDto {
  sessionId: string;
  finalBalance: string;
  backendSig: string;
  userSig: string;
}

export class EmergencyWithdrawDto {
  token: string;
  amount: string;
}

export class GetSessionDto {
  sessionId: string;
}
