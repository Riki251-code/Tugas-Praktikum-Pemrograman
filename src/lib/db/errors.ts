export class RepoError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RepoError";
    this.status = status;
  }
}

