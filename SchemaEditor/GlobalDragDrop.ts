/**
 * Global drag drop data
 */
export type GlobalDragDropData = {
    type: string;
    unid: string;
};

/**
 * Globa drag drop
 */
export class GlobalDragDrop {

    /**
     * drag data
     */
    public static dragData: GlobalDragDropData|null = null;

}