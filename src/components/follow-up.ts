export interface SelectionActionState {
    text: string;
    top: number;
    left: number;
    placement: 'above' | 'below';
}

export interface FollowUpSendPayload {
    promptText: string;
    sourceSelection: string;
}