import isUndefined from 'lodash/isUndefined';
import isString from 'lodash/isString';
import isObject from 'lodash/isObject';
// Build a reducer in order to ease the creation on these in 80% of the cases
// ## doc
// To build a reducer you need to provide an object which is
// ```javascript
// {
//  types : {
//    load: { request, response, error} which are the types for the load action
//    save: { request, response, error} which are the types for the save action
//  },
//  defaultState: the default state of your reducer
// }
// ```
//
// ## example
// ```javascript
// const DEFAULT_USER_STATE = {firstName: 'Test'};
// const userReducer = buildReducer({types: {
//    load: {request: REQUEST_LOAD_USER, response: RESPONSE_LOAD_USER},
//    save: {request: REQUEST_SAVE_USER, response: RESPONSE_SAVE_USER}
//  },
//  defaultState: DEFAULT_USER_STATE
// })
// ```
// will produce
// ```javascript
// function userReducer(state = DEFAULT_STATE, {type, payload}){
// const {data} = state;
//  switch (type) {
//   case REQUEST_LOAD_USER:
//       return {data, loading: true, saving: false};
//   case RESPONSE_LOAD_USER:
//       return {data: payload, loading: false, saving: false};
//   default:
//       return state
//  }
// }
// ```

const getDefaultState = defaultData => ({
    data: defaultData,
    loading: false,
    saving: false
});

const _reducerBuilder = ({types, defaultData}) => ((state = getDefaultState(defaultData), {type, payload}) => {
    //todo: add some validation and check here
    const {load ={}, save ={}} = types;
    switch(type) {
        case load.request:
            return {...state, loading: true};
        case save.request:
            return {...state, saving: true};
        case load.response:
            return {...state, data: payload, loading: false};
        case save.response:
            return {...state, data: payload, saving: false};
        case load.error:
            return {...state, loading: false};
        case save.error:
            return {...state, saving: false};
        default:
            return state;
    }
});

type ReducerBuilderOptions = { defaultData: Object, name: string, loadTypes: Object, saveTypes: Object};

// Build a reducer in order to ease the creation on these in 80% of the cases
// ## doc
// To build a reducer you need to provide an object which is
// ```javascript
// {
//     name
//   loadTypes { request, response, error} which are the types for the load action generated by the action builder
//    saveTypes: { request, response, error} which are the types for the save action generated by the action builder
//    defaultData: the default state of your reducer
// }
// ```
//
// ## example
// ```javascript
// const DEFAULT_USER_STATE = {firstName: 'Test'};
// const userReducer = buildReducer({
//    name: 'user' // The entity you need.
//    loadTypes: {REQUEST_LOAD_USER, RESPONSE_LOAD_USER},
//    saveTypes: {REQUEST_SAVE_USER, RESPONSE_SAVE_USER},
//    defaultData: DEFAULT_USER_STATE
// })
// ```
// will produce
// ```javascript
// function userReducer(state = DEFAULT_STATE, {type, payload}){
// const {data} = state;
//  switch (type) {
//   case REQUEST_LOAD_USER:
//       return {data, loading: true, saving: false};
//   case RESPONSE_LOAD_USER:
//       return {data: payload, loading: false, saving: false};
//   default:
//       return state
//  }
// }
// ```
export function reducerBuilder({defaultData, name, loadTypes, saveTypes} : ReducerBuilderOptions){
  if(!isString(name)){
    throw new Error('REDUCER_BUILDER: you need to provide a name.')
  }
  if(!isObject(loadTypes) && !isObject(saveTypes)){
    throw new Error('REDUCER_BUILDER: you need to provide loadTypes or saveTypes with REQUEST AND RECEIVE inside.')
  }
  const UPPERCASE_NAME = name.toUpperCase();

  const reducerBuilderTypes = {};
  if(isObject(loadTypes)){
    const REQUEST_LOAD = loadTypes[`REQUEST_LOAD_${UPPERCASE_NAME}`];
    const RESPONSE_LOAD = loadTypes[`RESPONSE_LOAD_${UPPERCASE_NAME}`];
    reducerBuilderTypes.load=  {request: REQUEST_LOAD, response: RESPONSE_LOAD};
  }

  if(isObject(saveTypes)){
    const REQUEST_SAVE = saveTypes[`REQUEST_SAVE_${UPPERCASE_NAME}`];
    const RESPONSE_SAVE = saveTypes[`RESPONSE_SAVE_${UPPERCASE_NAME}`];
    reducerBuilderTypes.save=  {request: REQUEST_SAVE, response: RESPONSE_SAVE};

  }


  // if(
  //   isUndefined(REQUEST_LOAD) &&
  //   isUndefined(RESPONSE_LOAD) &&
  //   isUndefined(REQUEST_SAVE) &&
  //   isUndefined(RESPONSE_SAVE)
  // ){
  //   //throw new Error('REDUCER_BUILDER: you need provide a load and a save type to the reducer builder');
  // }
  return _reducerBuilder({
    defaultData,
    types: reducerBuilderTypes
  });
}
