
const { registerTtsProvider } = await import('/scripts/extensions/tts/index.js')
import { TtsWebuiProvider } from './tts-webui.js';

registerTtsProvider('Chatterbox Beta (TTS WebUI)', TtsWebuiProvider)
