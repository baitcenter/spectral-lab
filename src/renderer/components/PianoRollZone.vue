<template>
  <v-content class="piano-roll-zone">
    <v-container
      fluid
      fill-height
    >
      <v-layout column>
        <v-flex>
          <audio-info-container />
        </v-flex>
        <v-flex>
          <toolbar />
        </v-flex>
        <v-flex>
          <info-bar />
        </v-flex>
        <v-flex>
          <piano-roll />
        </v-flex>
        <v-flex>
          <footer-toolbar />
        </v-flex>
      </v-layout>
    </v-container>
  </v-content>
</template>

<script>
import PianoRoll from './PianoRoll';
import Toolbar from './Toolbar';
import InfoBar from './InfoBar';
import AudioInfoContainer from './AudioInfoContainer';
import FooterToolbar from './FooterToolbar';

export default {
  components: {
    AudioInfoContainer,
    PianoRoll,
    Toolbar,
    FooterToolbar,
    InfoBar
  }
};
</script>

<style scoped>
</style>
