import { BaseModel, Note } from './index';
import { makeMandatory } from '../utils';
import { NOTE_OFF } from '../../constants/model-types';

export default class NoteOff extends BaseModel {
  static get entity () {
    return 'noteOffs';
  }

  static fields () {
    return {
      id: this.attr(null, makeMandatory('id')),
      noteId: this.attr(null),
      type: this.string(NOTE_OFF),
      offsetTime: this.number(1), // in tick
      noteOffVelocity: this.number(0),
      pitchBend: this.number(null).nullable(), // in midi note number. Negative float is acceptable.
      pressure: this.number(null).nullable(), // from 0.0 to 1.0.
      timbre: this.number(null).nullable(), // from 0.0 to 1.0.
      selected: this.boolean(false)
    };
  }

  get parent () {
    return Note.query().whereId(this.noteId).first();
  }
}
