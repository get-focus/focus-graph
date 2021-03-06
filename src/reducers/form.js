import {CREATE_FORM, DESTROY_FORM, SYNC_FORMS_ENTITY, SYNC_FORM_ENTITIES, TOGGLE_FORM_EDITING, SET_FORM_TO_SAVING, CLEAR_FORM} from '../actions/form';
import {INPUT_CHANGE, INPUT_ERROR, INPUT_ERROR_LIST, INPUT_CHANGE_ERROR, INPUT_ERROR_CHANGE_LIST} from '../actions/input';
import find from 'lodash/find';
import xorWith from 'lodash/xorWith';
import isUndefined from 'lodash/isUndefined';
import findIndex from 'lodash/findIndex';
import clone from 'lodash/clone';
import omit from 'lodash/omit'
import isArray from 'lodash/isArray';
const initializeField = field => ({
    valid: true,
    error: null,
    active: true,
    dirty: false,
    loading: false,
    saving: false,
    ...field
});

const findField = (fields, entityPath, name) => find(fields, {entityPath, name});
const getFieldsOutterJoin = (firstSource, secondSource) => xorWith(firstSource, secondSource, (a, b) => a.name === b.name && a.entityPath === b.entityPath);
const isNotAFieldFromForm = ({dirty}) => isUndefined(dirty);

type FormStateType = {
  formKey: string, // The name of the form in the state shape. This name is provide to the connector.
  entityPathArray: Array<string>, // An array of entity path use to build the field.
  editing: boolean, // A boolean which indicates wether this form has editing
  loading: boolean, // A boolean which indicates if the form is waiting for an action to be completed
  saving: boolean, // A boolean which indicates if the form is in saving mode
  fields: Array<FieldStateType> // The array of fields composing the form n(constructed with both data and definitions)
}

type FieldStateType = {
  name: string, // The name of the field action.fieldName,
  entityPath: string, // The path to the entity definition,
  valid: boolean, // The validation status of the field
  error: ?string, // The error which can come along with the field
  loading: boolean, // Is the field in a loading state
  saving: boolean, // Is the field in saving mode
  active: boolean, // Has the field a focus
  dirty: true, // Is the data different from the data in the data part of the state
  rawInputValue: Object | string | number | Array<Object | string | number > , // The  value as it is from the webservice or raw typed by the user.
  formattedInputValue: Object | string | number | Array<Object | string | number > // The value with formatter applied
}

// This middleware is used to build and maintain the form part of the state.
// Each form has a name in the state
//
const forms = (state: Array<FormStateType> = [], action) => {
    switch (action.type) {
        case CREATE_FORM:
            // When creating a form, simply initialize all the fields and pass it to the new form object
            return [...state, {
                formKey: action.formKey,
                entityPathArray: action.entityPathArray,
                editing: false,
                loading: false,
                saving: false,
                error: false,
                fields: action.fields.map(initializeField)
            }];
        case DESTROY_FORM:
            return state.filter(({formKey: candidateKey}) => candidateKey !== action.formKey);
        case CLEAR_FORM :
           return state.map(form => ({
             ...form,
             ...(form.formKey === action.formKey ? {
                 fields: form.fields.map(field => {
                   if((action.defaultData && Object.keys(action.defaultData).find(element => element === field.name) === undefined) || action.defaultData === null || action.defaultData === undefined) {
                     return {
                          ...field,
                          formattedInputValue : null,
                          rawInputValue: null,
                          dataSetValue: null
                        };
                   } else if(Object.keys(action.defaultData).find(element => element === field.name)) {
                          return {
                            ...field,
                            formattedInputValue : action.defaultData[field.name],
                            rawInputValue: action.defaultData[field.name],
                            dataSetValue: action.defaultData[field.name]
                          };
                      }
                 })
             } : {})
           }));
        case SYNC_FORMS_ENTITY:
            // Iterate over all forms, and synchronise fields with the dataset
            return state.map(form => {
                if (form.entityPathArray.indexOf(action.entityPath) === -1) return form;
                const newForm = {
                    ...form,
                    fields: [
                        ...form.fields.map(formField => {
                            const candidateField = findField(action.fields, formField.entityPath, formField.name);
                            if (!candidateField) return formField;
                            return {
                                ...formField,
                                ...candidateField,
                                dirty: false
                            };
                        }),
                        // Get the outter intersection of the action fields and the form fields, meaning the
                        // fields to update that are not in the form, or the form fields that should not be updated
                        ...getFieldsOutterJoin(form.fields, action.fields)
                        // then filter it to remove the existing form fields, and create the missing fields
                        .filter(isNotAFieldFromForm)
                        .map(initializeField)
                    ]
                };
                // Iterate over fields to check if form is loading
                newForm.loading = newForm.fields.reduce((acc, {loading}) => acc || loading, false);
                newForm.error = newForm.fields.find(element => element.error) ? true: false;
                // Iterate over fields to check if the form was saving and that all fields have saved.
                // If that's the case, then the form has finished saving, so toggle it.
                if (newForm.saving) {
                    const areFieldsStillSaving = newForm.fields.reduce((acc, {saving}) => acc || saving, false);
                    newForm.saving = areFieldsStillSaving;
                }
                return newForm;
            });
        case SYNC_FORM_ENTITIES:
            const formIndex = findIndex(state, {formKey: action.formKey});
            return [
                ...state.slice(0, formIndex),
                {
                    ...state[formIndex],
                    fields: action.fields
                },
                ...state.slice(formIndex + 1)
            ];
        case INPUT_CHANGE:
            // Check if the field to change exists
            const changedFieldExistsInForm = !isUndefined(find(find(state, {formKey: action.formKey}).fields, {name: action.fieldName, entityPath: action.entityPath}));
            if (!changedFieldExistsInForm) {
                // It does not exist, so create it
                return state.map(form => ({
                    ...form,
                    ...(form.formKey === action.formKey ? {
                        fields: [
                            // Keep the other fields
                            ...form.fields,
                            // Create the new one
                            {
                                name: action.fieldName,
                                entityPath: action.entityPath,
                                valid: true,
                                error: null,
                                loading: false,
                                saving: false,
                                active: true,
                                rawValid: true,
                                dirty: true,
                                rawInputValue: action.rawValue,
                                formattedInputValue: action.formattedValue
                            }
                        ]
                    } : {})
                }));
            } else {
              //TODO check if it's an array field
                // The field exists, so just update the rawInputValue
                return state.map(form => {
                  return {
                      ...form,
                      ...(form.formKey === action.formKey ? {
                          fields: form.fields.map(field => {
                              const isFieldConcerned = field.name === action.fieldName && field.entityPath === action.entityPath;
                              if (!isFieldConcerned) return field;
                              let initTab = [], newFieldTab = [...field.rawValid];
                              initTab[action.index] = {[action.propertyNameLine]: true}
                              newFieldTab[action.index] = {...field.rawValid[action.index],[action.propertyNameLine]: true}
                              const tabRawValid = isArray(field.rawValid) ? newFieldTab : initTab ;
                              const tabValid = isArray(field.valid) ? newFieldTab : initTab;

                              return {
                                  ...field,
                                  rawInputValue: action.rawValue,
                                  formattedInputValue: action.formattedValue,
                                  dirty: true,
                                  valid: action.propertyNameLine ?
                                          tabValid.reduce((acc, valid, index) => {
                                            if(!valid[action.propertyNameLine] && index === action.index ){
                                              acc.push({...valid, [action.propertyNameLine] : true})
                                              return acc;
                                            }
                                            acc.push(valid);
                                            return acc;
                                          }, [])
                                          : true,
                                  rawValid: action.propertyNameLine ? tabRawValid.reduce((acc, rawValid, index) => {

                                    if(!rawValid[action.propertyNameLine] && index === action.index ){
                                      acc.push({...rawValid, [action.propertyNameLine] : true})
                                      return acc;
                                    }
                                    acc.push(rawValid);
                                    return acc;
                                }, []) :  true
                              };
                          })
                      } : {})
                    }
                });
            }
        case INPUT_CHANGE_ERROR:
            return state.map(form => ({
                ...form,
                ...(form.formKey === action.formKey ? {
                    fields: form.fields.map(field => {
                        const isFieldConcerned = field.name === action.fieldName && field.entityPath === action.entityPath;
                        if (!isFieldConcerned) return field;
                        return {
                            ...field,
                            rawValid: false
                        };
                    })
                } : {})
            }));
        case INPUT_ERROR:
            return state.map(form => ({
                ...form,
                ...(form.formKey === action.formKey ? {
                    fields: form.fields.map(field => {
                        const isFieldConcerned = field.name === action.fieldName && field.entityPath === action.entityPath;
                        if (!isFieldConcerned) return field;
                        return {
                            ...field,
                            error: action.error,
                            valid: false
                        };
                    })
                } : {})
            }));
      case INPUT_ERROR_LIST:
          return state.map(form => ({
              ...form,
              ...(form.formKey === action.formKey ? {
                  fields: form.fields.map((field, index) => {
                      const isFieldConcerned = field.name === action.fieldName && field.entityPath === action.entityPath;
                      if (!isFieldConcerned) return field;
                      const error= (isArray(field.error) ? [...field.error] : [] );
                      const valid = (isArray(field.rawValid) ? [...field.rawValid] : [])
                      const errorLine ={...error[index], ...error[action.index], [action.propertyNameLine] : action.error}
                      const validLine = {...valid[index], ...valid[action.index], [action.propertyNameLine] : false}
                      error[action.index] = errorLine;
                      valid[action.index] = validLine;
                      return {
                          ...field,
                          error: error,
                          valid: valid,
                          rawValid: valid
                      };
                  })

              }  : {})
          }));
      case INPUT_ERROR_CHANGE_LIST:
          return state.map(form => ({
              ...form,
              ...(form.formKey === action.formKey ? {
                  fields: form.fields.map((field, index) => {
                      const isFieldConcerned = field.name === action.fieldName && field.entityPath === action.entityPath;
                      if (!isFieldConcerned) return field;
                      const valid = (isArray(field.rawValid) ? [...field.rawValid] : []);
                      const  validLine = {...valid[index], ...valid[action.index], [action.propertyNameLine] : false}
                      valid[action.index] = validLine;
                      return {
                          ...field,
                          rawValid: valid
                      };
                  })

              }  : {})
          }));
        case TOGGLE_FORM_EDITING:
            return state.map(form => {
                // Check if form is the action's target form
                if (form.formKey === action.formKey) {
                    return {
                        ...form,
                        editing: action.editing,
                        fields: action.editing ? form.fields : form.fields.map(({dataSetValue, ...otherAttributes}) => ({
                            ...otherAttributes,
                            rawInputValue: dataSetValue,
                            error: null,
                            valid: true,
                            dataSetValue
                        }))
                    };
                } else {
                    return form;
                }
            });
        case SET_FORM_TO_SAVING:
            return state.map(form => {
                // Check if form is the action's target form
                if (form.formKey === action.formKey) {
                    return {
                        ...form,
                        fields: form.fields.map(({valid, error, ...restOfField}) => ({
                            valid: true,
                            error: null,
                            ...restOfField
                        })),
                        saving: true
                    };
                } else {
                    return form;
                }
            });
        default:
            return state;
    }
}

export default forms;
