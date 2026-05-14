export interface ParticipationEvent {
  documentId: string;
  title: string;
  start?: string;
  end?: string;
}

export interface ParticipationRecord {
  documentId: string;
  registeredAt?: string;
  event?: ParticipationEvent;
}
