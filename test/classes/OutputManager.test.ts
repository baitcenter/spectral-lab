// @ts-nocheck
import OutputManager from '../../src/renderer/modules/outputManager';
import { NOTE_ON, MODULATION, NOTE_OFF } from '../../src/renderer/constants/model-types';
import { processClip } from '../../src/renderer/modules/outputManager/utils';

const options = {
  masterChannels: [1],
  memberChannels: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  pitchBendRange: 48,
  nowCb: () => {
    const [sec, ns] = process.hrtime();
    return sec * 1e3 + ns / 1e6;
  },
  send: console.log
};
const allMemberChannels = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const memberChannelsExcept5 = [2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const noteOn: any = {
  type: NOTE_ON,
  pitchBend: 0,
  noteOnVelocity: 0.5,
  timbre: 0.5,
  pressure: 0.5,
  parent: { noteNumber: 60 }
};
const modulations: any = [
  { input: { pitchBend: -24 }, expected: [[225, 0, 32]] },
  { input: { pressure: 0.5 }, expected: [[209, 64]] },
  { input: { timbre: 0.5, irrelevantProperty: 1 }, expected: [[177, 74, 64]] },
  {
    input: { pitchBend: 48, timbre: 1, pressure: 1 },
    expected: [[225, 127, 127], [209, 127], [177, 74, 127]]
  }
];
const noteOff: any = { noteOffVelocity: 0.5 };

describe('allocateChannel', () => {
  test('allocates channel', () => {
    const outputManager = new OutputManager(options);
    memberChannelsExcept5.forEach((ch) => {
      outputManager.findMemberChannel(ch).buildNoteOnRelatedMessages(noteOn);
    });
    expect(outputManager.allocateChannel().midiChannel).toBe(5);
  });

  test('allocates channel when multiple channels are unoccupied', () => {
    const outputManager = new OutputManager(options);
    allMemberChannels.forEach((ch) => {
      outputManager.findMemberChannel(ch).buildNoteOnRelatedMessages(noteOn);
    });
    outputManager.findMemberChannel(5).buildNoteOffMessages(noteOff);
    outputManager.findMemberChannel(7).buildNoteOffMessages(noteOff);
    outputManager.findMemberChannel(15).buildNoteOffMessages(noteOff);
    expect(outputManager.allocateChannel().midiChannel).toBe(5);
  });

  test('allocates channel when all the channels are occupied', () => {
    const outputManager = new OutputManager(options);
    allMemberChannels.forEach((ch) => {
      outputManager.findMemberChannel(ch).buildNoteOnRelatedMessages(noteOn);
    });
    memberChannelsExcept5.forEach((ch) => {
      outputManager.findMemberChannel(ch).buildNoteOnRelatedMessages(noteOn);
    });
    expect(outputManager.allocateChannel().midiChannel).toBe(5);
  });
});

describe('executes noteActions', () => {
  test('noteOn => modulation => noteOff', () => {
    const mockFn = jest.fn();
    const outputManager = new OutputManager(Object.assign({}, options, { send: mockFn }));
    const noteControl = outputManager.noteOn(noteOn);
    expect(mockFn.mock.calls).toHaveLength(4);
    expect(mockFn.mock.calls[0][0]).toEqual([177, 74, 64]);
    expect(mockFn.mock.calls[1][0]).toEqual([209, 64]);
    expect(mockFn.mock.calls[2][0]).toEqual([225, 0, 64]);
    expect(mockFn.mock.calls[3][0]).toEqual([145, 60, 64]);
    const modulation = modulations[0];
    noteControl.modulate(Object.assign({}, modulation.input, { type: MODULATION }));
    expect(mockFn.mock.calls[4][0]).toEqual(modulation.expected[0]);
    noteControl.noteOff(Object.assign({}, noteOff, { type: NOTE_OFF }));
    expect(mockFn.mock.calls[5][0]).toEqual([129, 60, 64]);
  });
  test('noteOn => noteOff => modulation => noteOn => modulation', () => {
    const mockFn = jest.fn();
    const outputManager = new OutputManager(Object.assign({}, options, { send: mockFn }));
    const firstNoteControl = outputManager.noteOn(noteOn);
    const firstModulation = modulations[0];
    expect(mockFn.mock.calls).toHaveLength(4);
    firstNoteControl.noteOff(Object.assign({}, noteOff, { type: NOTE_OFF }));
    expect(mockFn.mock.calls).toHaveLength(5);
    firstNoteControl.modulate(Object.assign({}, firstModulation.input, { type: MODULATION })); // Send nothing. firstNoteControl has already been released.
    expect(mockFn.mock.calls).toHaveLength(5);
    const secondNoteControl = outputManager.noteOn(noteOn);
    expect(mockFn.mock.calls).toHaveLength(9);
    const secondModulation = modulations[1];
    firstNoteControl.modulate(Object.assign({}, secondModulation.input, { type: MODULATION })); // Send nothing. firstNoteControl has already been released.
    expect(mockFn.mock.calls).toHaveLength(9);
    secondNoteControl.modulate(Object.assign({}, secondModulation.input, { type: MODULATION })); // Send to channel 3, whose timeOfNoteOff is older than channel 2.
    expect(mockFn.mock.calls).toHaveLength(10);
    expect(mockFn.mock.calls[9][0]).toEqual([210, 64]);
  });
  test('executes noteOn 18 times', () => {
    const mockFn = jest.fn();
    const outputManager = new OutputManager(Object.assign({}, options, { send: mockFn }));
    for (let i = 0; i < 15; i++) {
      outputManager.noteOn(noteOn);
    }
    expect(mockFn.mock.calls).toHaveLength(15 * 4);
    for (let i = 0; i < 3; i++) {
      outputManager.noteOn(noteOn);
    }
    expect(mockFn.mock.calls).toHaveLength(15 * 4 + 3 * 1 + 3 * 4); // noteOnRelatedMessages + noteOffMessages + noteOnRelatedMessages
  });
});

describe('executes processClip method', () => {
  test('processes clip', () => {
    const mockClip:any = {
      offsetTime: 10,
      sortedNoteActions: [
        {
          absoluteTime: 10,
          type: NOTE_ON,
          parent: {
            offsetTime: 10
          }
        },
        {
          absoluteTime: 20,
          type: MODULATION,
          offsetTime: 10,
          parent: {
            offsetTime: 10
          }
        },
        {
          absoluteTime: 30,
          type: NOTE_ON,
          parent: {
            offsetTime: 30
          }
        },
        {
          absoluteTime: 40,
          offsetTime: 30,
          type: NOTE_OFF,
          parent: {
            offsetTime: 10
          }
        }
      ]
    };
    const mockModulateFunc = jest.fn();
    const mockNoteOffFunc = jest.fn();
    const mockNoteOnFunc = jest.fn(() => ({
      modulate: mockModulateFunc,
      noteOff: mockNoteOffFunc
    }));
    const mockOutputManager: any = { noteOn: mockNoteOnFunc };
    processClip(mockClip, mockOutputManager);
    expect(mockNoteOnFunc.mock.calls.length).toBe(2);
    expect(mockModulateFunc.mock.calls.length).toBe(1);
    expect(mockNoteOffFunc.mock.calls.length).toBe(1);
    expect(mockNoteOnFunc.mock.calls[0]).toEqual([{
      absoluteTime: 10,
      type: NOTE_ON,
      parent: {
        offsetTime: 10
      }
    }, 10]);
    expect(mockNoteOnFunc.mock.calls[1]).toEqual([{
      absoluteTime: 30,
      type: NOTE_ON,
      parent: {
        offsetTime: 30
      }
    }, 30]);
    expect(mockModulateFunc.mock.calls[0]).toEqual([
      {
        absoluteTime: 20,
        type: MODULATION,
        offsetTime: 10,
        parent: {
          offsetTime: 10
        }
      },
      20
    ]);
    expect(mockNoteOffFunc.mock.calls[0]).toEqual([
      {
        absoluteTime: 40,
        offsetTime: 30,
        type: NOTE_OFF,
        parent: {
          offsetTime: 10
        }
      },
      40
    ]);
  });
});
