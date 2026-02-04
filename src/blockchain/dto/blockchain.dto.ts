export class MintDto {
  to: string;
  amount: string;
}

export class TransferDto {
  to: string;
  amount: string;
}

export class BurnDto {
  amount: string;
}

export class ApproveDto {
  spender: string;
  amount: string;
}

export class AllowanceDto {
  owner: string;
  spender: string;
}

export class BalanceOfDto {
  address: string;
}
