
import {
  REQUEST_ENTITY,
  RECEIVE_ENTITY
} from '../actions';
const DEFAULT_STATE = {
  entity:{
    data:{
      firstName: {
        value: 'Yoooooo',
        name: 'firstName'
      }
    }
  }
};
export default function entityReducer(state = DEFAULT_STATE, {type, payload}){
  const {entity: entityState, ...otherStateProp} = state;
 switch (type) {
  case REQUEST_ENTITY:
      return {
        ...otherStateProp,
        entity: {data: entityState.data, isLoading: true}
      };
  case RECEIVE_ENTITY:
      return {
        ...otherStateProp,
        entity: {data: payload, isLoading: false}
      };
  default:
      return state
  }
}