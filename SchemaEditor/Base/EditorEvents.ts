/**
 * Editor events
 */
export enum EditorEvents {
    showTable = 'schemaeditor:showtable',
    updateName = 'schemaeditor:updatename',
    moveTo = 'schemaeditor:moveto',
    updateData = 'schemaeditor:updatedata',
    sortEntries = 'schemaeditor:sortingentries',
    deleteFolderFile = 'schemaeditor:deletefolderfile',
    deleteLinkTable = 'schemaeditor:deletelinktable',
    deleteEnumTable = 'schemaeditor:deleteenumtable',
    deleteSchemaTable = 'schemaeditor:deleteschematable',
    updateView = 'schemaeditor:updateview',
    selectTable = 'schemaeditor:selecttable',
    invokeSchema = 'schemaeditor:invokeschema',
    validateSchema = 'schemaeditor:validateschema'
}