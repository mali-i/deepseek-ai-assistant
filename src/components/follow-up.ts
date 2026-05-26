export interface SelectionActionState {
    text: string;
    sourceConversationId: string;
    top: number;
    left: number;
    placement: 'above' | 'below';
}

export interface FollowUpSendPayload {
    promptText: string;
    sourceSelection: string;
    sourceConversationId: string;
}
