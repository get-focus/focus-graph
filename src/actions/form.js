export const CREATE_FORM = 'CREATE_FORM';
export const DESTROY_FORM ='DESTROY_FORM';

export const INPUT_CHANGE = 'INPUT_CHANGE';
export const INPUT_ERROR = 'INPUT_ERROR';

export const SYNC_FORM_ENTITY = 'SYNC_FORM_ENTITY';

export const createForm = (key, entityPathArray) => ({
    type: CREATE_FORM,
    key,
    entityPathArray
});

export const destroyForm = key => ({
    type: DESTROY_FORM,
    key
});

export const syncFormEntity = (entityPath, fields) => ({
    type: SYNC_FORM_ENTITY,
    entityPath,
    fields
});

export const inputChange = (formKey, fieldName, entityPath, value) => ({
    type: INPUT_CHANGE,
    formKey,
    fieldName,
    entityPath,
    value
});