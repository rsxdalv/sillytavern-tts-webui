// import { getPreviewString, saveTtsProviderSettings } from './index.js';
const { getPreviewString, saveTtsProviderSettings } = await import('/scripts/extensions/tts/index.js')

export { TtsWebuiProvider };

const SUPPORTED_LANGUAGES = {
  ar: "Arabic 🇸🇦",
  da: "Danish 🇩🇰",
  de: "German 🇩🇪",
  el: "Greek 🇬🇷",
  en: "English 🇬🇧",
  es: "Spanish 🇪🇸",
  fi: "Finnish 🇫🇮",
  fr: "French 🇫🇷",
  he: "Hebrew 🇮🇱",
  hi: "Hindi 🇮🇳",
  it: "Italian 🇮🇹",
  ja: "Japanese 🇯🇵",
  ko: "Korean 🇰🇷",
  ms: "Malay 🇲🇾",
  nl: "Dutch 🇳🇱",
  no: "Norwegian 🇳🇴",
  pl: "Polish 🇵🇱",
  pt: "Portuguese 🇧🇷",
  ru: "Russian 🇷🇺",
  sv: "Swedish 🇸🇪",
  sw: "Swahili 🇰🇪",
  tr: "Turkish 🇹🇷",
  zh: "Chinese 🇨🇳",
};

class TtsWebuiProvider {
    settings;
    voices = [];
    separator = ' . ';

    audioElement = document.createElement('audio');
    audioContext = null;
    audioWorkletNode = null;
    currentVolume = 1.0; // Track current volume

    defaultSettings = {
        voiceMap: {},
        model: 'chatterbox',
        speed: 1,
        volume: 1.0,
        available_voices: [''],
        provider_endpoint: 'http://127.0.0.1:7778/v1/audio/speech',
        api_key: '',
        streaming: true,
        streaming_mode: 'worklet', // 'worklet' | 'blob'
        stream_chunk_size: 100,
        desired_length: 80,
        max_length: 200,
        halve_first_chunk: true,
        exaggeration: 0.5,
        cfg_weight: 0.5,
        temperature: 0.8,
        device: 'auto',
        dtype: 'bfloat16',
        cpu_offload: false,
        chunked: true,
        cache_voice: false,
        tokens_per_slice: 1000, // deprecated
        remove_milliseconds: 45, // deprecated
        remove_milliseconds_start: 25, // deprecated
        chunk_overlap_method: 'zero', // deprecated
        seed: -1,
        // use_compilation: false,
        initial_forward_pass_backend: "eager",
        generate_token_backend: "cudagraphs-manual",
        max_new_tokens: 1000,
        max_cache_len: 1500,
        language_id: "en",
        model_name: "just_a_placeholder",
    };

    get settingsHtml() {
        let html = `
        <h4 class="textAlignCenter">TTS WebUI Settings</h4>
        
        <div class="flex gap10px marginBot10 alignItemsFlexEnd">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_endpoint">Provider Endpoint:</label>
                <input id="tts_webui_endpoint" type="text" class="text_pole" maxlength="500" value="${this.defaultSettings.provider_endpoint}"/>
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_api_key">API Key:</label>
                <input id="tts_webui_api_key" type="password" class="text_pole" maxlength="200" value="${this.defaultSettings.api_key}" placeholder="Optional — leave blank if not required"/>
            </div>
        </div>
        
        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_model">Model:</label>
                <input id="tts_webui_model" type="text" class="text_pole" maxlength="500" value="${this.defaultSettings.model}"/>
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_voices">Available Voices (comma separated):</label>
                <input id="tts_webui_voices" type="text" class="text_pole" value="${this.defaultSettings.available_voices.join()}"/>
            </div>
        </div>
        
        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_streaming" class="checkbox_label alignItemsCenter flexGap5">
                    <input id="tts_webui_streaming" type="checkbox" />
                    <span>Streaming</span>
                </label>
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_streaming_mode">Streaming Mode:</label>
                <select id="tts_webui_streaming_mode">
                    <option value="worklet" ${this.defaultSettings.streaming_mode === 'worklet' ? 'selected' : ''}>Worklet</option>
                    <option value="blob" ${this.defaultSettings.streaming_mode === 'blob' ? 'selected' : ''}>Blob</option>
                </select>
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_volume">Volume: <span id="tts_webui_volume_output">${this.defaultSettings.volume}</span></label>
                <input type="range" id="tts_webui_volume" value="${this.defaultSettings.volume}" min="0" max="2" step="0.1">
            </div>
        </div>
        
        <hr>
        <h4 class="textAlignCenter">Generation Settings</h4>
        
        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_exaggeration">Exaggeration: <span id="tts_webui_exaggeration_output">${this.defaultSettings.exaggeration}</span></label>
                <input id="tts_webui_exaggeration" type="range" value="${this.defaultSettings.exaggeration}" min="0" max="2" step="0.1" />
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_cfg_weight">CFG Weight: <span id="tts_webui_cfg_weight_output">${this.defaultSettings.cfg_weight}</span></label>
                <input id="tts_webui_cfg_weight" type="range" value="${this.defaultSettings.cfg_weight}" min="0" max="2" step="0.1" />
            </div>
        </div>
        
        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_temperature">Temperature: <span id="tts_webui_temperature_output">${this.defaultSettings.temperature}</span></label>
                <input id="tts_webui_temperature" type="range" value="${this.defaultSettings.temperature}" min="0" max="2" step="0.1" />
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_seed">Seed (-1 for random):</label>
                <input id="tts_webui_seed" type="text" class="text_pole" value="${this.defaultSettings.seed}"/>
            </div>
        </div>
        
        <hr>
        <h4 class="textAlignCenter">Chunking</h4>
        
        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_chunked" class="checkbox_label alignItemsCenter flexGap5">
                    <input id="tts_webui_chunked" type="checkbox" />
                    <span>Split prompt into chunks</span>
                </label>
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_halve_first_chunk" class="checkbox_label alignItemsCenter flexGap5">
                    <input id="tts_webui_halve_first_chunk" type="checkbox" />
                    <span>Halve First Chunk</span>
                </label>
            </div>
        </div>
        
        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_desired_length">Desired Length: <span id="tts_webui_desired_length_output">${this.defaultSettings.desired_length}</span></label>
                <input id="tts_webui_desired_length" type="range" value="${this.defaultSettings.desired_length}" min="25" max="300" step="5" />
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_max_length">Max Length: <span id="tts_webui_max_length_output">${this.defaultSettings.max_length}</span></label>
                <input id="tts_webui_max_length" type="range" value="${this.defaultSettings.max_length}" min="50" max="450" step="5" />
            </div>
        </div>
        
        <hr>
        <h4 class="textAlignCenter">Model</h4>
        
        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_device">Device:</label>
                <select id="tts_webui_device">
                    <option value="auto" ${this.defaultSettings.device === 'auto' ? 'selected' : ''}>Auto</option>
                    <option value="cuda" ${this.defaultSettings.device === 'cuda' ? 'selected' : ''}>CUDA</option>
                    <option value="mps" ${this.defaultSettings.device === 'mps' ? 'selected' : ''}>MPS</option>
                    <option value="cpu" ${this.defaultSettings.device === 'cpu' ? 'selected' : ''}>CPU</option>
                </select>
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_dtype">Data Type:</label>
                <select id="tts_webui_dtype">
                    <option value="float32" ${this.defaultSettings.dtype === 'float32' ? 'selected' : ''}>Float32</option>
                    <option value="float16" ${this.defaultSettings.dtype === 'float16' ? 'selected' : ''}>Float16</option>
                    <option value="bfloat16" ${this.defaultSettings.dtype === 'bfloat16' ? 'selected' : ''}>BFloat16</option>
                </select>
            </div>
        </div>
        
        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_cpu_offload" class="checkbox_label alignItemsCenter flexGap5">
                    <input id="tts_webui_cpu_offload" type="checkbox" />
                    <span>CPU Offload</span>
                </label>
            </div>
        </div>

        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_initial_forward_pass_backend">Initial Forward Pass Backend:</label>
                <select id="tts_webui_initial_forward_pass_backend">
                    ${[
                        ["Eager", "eager"],
                        ["Cudagraphs", "cudagraphs"],
                    ].map(([label, value]) => `<option value="${value}" ${this.defaultSettings.initial_forward_pass_backend === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_generate_token_backend">Generate Token Backend:</label>
                <select id="tts_webui_generate_token_backend">
                    ${[
                        ["Cudagraphs Manual", "cudagraphs-manual"],
                        ["Eager", "eager"],
                        ["Cudagraphs", "cudagraphs"],
                        ["Inductor", "inductor"],
                        ["Cudagraphs Strided", "cudagraphs-strided"],
                        ["Inductor Strided", "inductor-strided"],
                    ].map(([label, value]) => `<option value="${value}" ${this.defaultSettings.generate_token_backend === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_model_name">Model Name (for TTS WebUI):</label>
                <select id="tts_webui_model_name">
                    ${[
                        ["English", "just_a_placeholder"],
                        ["Multilingual", "multilingual"],
                    ].map(([label, value]) => `<option value="${value}" ${this.defaultSettings.model_name === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
            </div>

            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_language_id">Language ID:</label>
                <select id="tts_webui_language_id">
                    ${Object.entries(SUPPORTED_LANGUAGES).map(([value, label]) => `<option value="${value}" ${this.defaultSettings.language_id === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="flex gap10px marginBot10">
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_max_new_tokens">Max new tokens: <span id="tts_webui_max_new_tokens_output">${this.defaultSettings.max_new_tokens}</span></label>
                <input id="tts_webui_max_new_tokens" type="range" value="${this.defaultSettings.max_new_tokens}" min="100" max="1000" step="10" />
            </div>
            <div class="flex1 flexFlowColumn">
                <label for="tts_webui_max_cache_len">Cache length: <span id="tts_webui_max_cache_len_output">${this.defaultSettings.max_cache_len}</span></label>
                <input id="tts_webui_max_cache_len" type="range" value="${this.defaultSettings.max_cache_len}" min="200" max="1500" step="10" />
            </div>
        </div>
        `;
        return html;
    }

    async loadSettings(settings) {
        // Populate Provider UI given input settings
        if (Object.keys(settings).length == 0) {
            console.info('Using default TTS Provider settings');
        }

        // Only accept keys defined in defaultSettings
        this.settings = this.defaultSettings;

        for (const key in settings) {
            if (key in this.settings) {
                this.settings[key] = settings[key];
            } else {
                throw `Invalid setting passed to TTS Provider: ${key}`;
            }
        }

        $('#tts_webui_endpoint').val(this.settings.provider_endpoint);
        $('#tts_webui_endpoint').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_api_key').val(this.settings.api_key);
        $('#tts_webui_api_key').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_model').val(this.settings.model);
        $('#tts_webui_model').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_voices').val(this.settings.available_voices.join());
        $('#tts_webui_voices').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_streaming').prop('checked', this.settings.streaming);
        $('#tts_webui_streaming').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_streaming_mode').val(this.settings.streaming_mode);
        $('#tts_webui_streaming_mode').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_volume').val(this.settings.volume);
        $('#tts_webui_volume').on('input', () => {
            this.onSettingsChange();
        });

        $('#tts_webui_stream_chunk_size').val(this.settings.stream_chunk_size);
        $('#tts_webui_stream_chunk_size').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_desired_length').val(this.settings.desired_length);
        $('#tts_webui_desired_length').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_max_length').val(this.settings.max_length);
        $('#tts_webui_max_length').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_halve_first_chunk').prop('checked', this.settings.halve_first_chunk);
        $('#tts_webui_halve_first_chunk').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_exaggeration').val(this.settings.exaggeration);
        $('#tts_webui_exaggeration').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_cfg_weight').val(this.settings.cfg_weight);
        $('#tts_webui_cfg_weight').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_temperature').val(this.settings.temperature);
        $('#tts_webui_temperature').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_device').val(this.settings.device);
        $('#tts_webui_device').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_dtype').val(this.settings.dtype);
        $('#tts_webui_dtype').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_cpu_offload').prop('checked', this.settings.cpu_offload);
        $('#tts_webui_cpu_offload').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_chunked').prop('checked', this.settings.chunked);
        $('#tts_webui_chunked').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_tokens_per_slice').val(this.settings.tokens_per_slice);
        $('#tts_webui_tokens_per_slice').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_remove_milliseconds').val(this.settings.remove_milliseconds);
        $('#tts_webui_remove_milliseconds').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_remove_milliseconds_start').val(this.settings.remove_milliseconds_start);
        $('#tts_webui_remove_milliseconds_start').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_chunk_overlap_method').val(this.settings.chunk_overlap_method);
        $('#tts_webui_chunk_overlap_method').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_seed').val(this.settings.seed);
        $('#tts_webui_seed').on('input', () => { this.onSettingsChange(); });

        // $('#tts_webui_use_compilation').prop('checked', this.settings.use_compilation);
        // $('#tts_webui_use_compilation').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_initial_forward_pass_backend').val(this.settings.initial_forward_pass_backend);
        $('#tts_webui_initial_forward_pass_backend').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_generate_token_backend').val(this.settings.generate_token_backend);
        $('#tts_webui_generate_token_backend').on('change', () => { this.onSettingsChange(); });

        $('#tts_webui_model_name').val(this.settings.model_name);
        $('#tts_webui_model_name').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_language_id').val(this.settings.language_id);
        $('#tts_webui_language_id').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_max_new_tokens').val(this.settings.max_new_tokens);
        $('#tts_webui_max_new_tokens').on('input', () => { this.onSettingsChange(); });

        $('#tts_webui_max_cache_len').val(this.settings.max_cache_len);
        $('#tts_webui_max_cache_len').on('input', () => { this.onSettingsChange(); });

        // Update output labels
        $('#tts_webui_volume_output').text(this.settings.volume);
        $('#tts_webui_desired_length_output').text(this.settings.desired_length);
        $('#tts_webui_max_length_output').text(this.settings.max_length);
        $('#tts_webui_exaggeration_output').text(this.settings.exaggeration);
        $('#tts_webui_cfg_weight_output').text(this.settings.cfg_weight);
        $('#tts_webui_temperature_output').text(this.settings.temperature);
        $('#tts_webui_tokens_per_slice_output').text(this.settings.tokens_per_slice);
        $('#tts_webui_remove_milliseconds_output').text(this.settings.remove_milliseconds);
        $('#tts_webui_remove_milliseconds_start_output').text(this.settings.remove_milliseconds_start);
        $('#tts_webui_max_new_tokens_output').text(this.settings.max_new_tokens);
        $('#tts_webui_max_cache_len_output').text(this.settings.max_cache_len);

        await this.checkReady();

        console.debug('OpenAI Compatible TTS: Settings loaded');
    }

    onSettingsChange() {
        // Update dynamically
        this.settings.provider_endpoint = String($('#tts_webui_endpoint').val());
        this.settings.api_key = String($('#tts_webui_api_key').val() || '').trim();
        this.settings.model = String($('#tts_webui_model').val());
        this.settings.available_voices = String($('#tts_webui_voices').val()).split(',');
        this.settings.volume = Number($('#tts_webui_volume').val());
        this.settings.streaming = $('#tts_webui_streaming').is(':checked');
        this.settings.streaming_mode = String($('#tts_webui_streaming_mode').val());
        this.settings.stream_chunk_size = Number($('#tts_webui_stream_chunk_size').val());
        this.settings.desired_length = Number($('#tts_webui_desired_length').val());
        this.settings.max_length = Number($('#tts_webui_max_length').val());
        this.settings.halve_first_chunk = $('#tts_webui_halve_first_chunk').is(':checked');
        this.settings.exaggeration = Number($('#tts_webui_exaggeration').val());
        this.settings.cfg_weight = Number($('#tts_webui_cfg_weight').val());
        this.settings.temperature = Number($('#tts_webui_temperature').val());
        this.settings.device = String($('#tts_webui_device').val());
        this.settings.dtype = String($('#tts_webui_dtype').val());
        this.settings.cpu_offload = $('#tts_webui_cpu_offload').is(':checked');
        this.settings.chunked = $('#tts_webui_chunked').is(':checked');
        this.settings.tokens_per_slice = Number($('#tts_webui_tokens_per_slice').val());
        this.settings.remove_milliseconds = Number($('#tts_webui_remove_milliseconds').val());
        this.settings.remove_milliseconds_start = Number($('#tts_webui_remove_milliseconds_start').val());
        this.settings.chunk_overlap_method = String($('#tts_webui_chunk_overlap_method').val());
        this.settings.seed = parseInt($('#tts_webui_seed').val()) || -1;
        // this.settings.use_compilation = $('#tts_webui_use_compilation').is(':checked');
        this.settings.initial_forward_pass_backend = String($('#tts_webui_initial_forward_pass_backend').val());
        this.settings.generate_token_backend = String($('#tts_webui_generate_token_backend').val());
        this.settings.model_name = String($('#tts_webui_model_name').val());
        this.settings.language_id = String($('#tts_webui_language_id').val());
        this.settings.max_new_tokens = Number($('#tts_webui_max_new_tokens').val());
        this.settings.max_cache_len = Number($('#tts_webui_max_cache_len').val());

        // Apply volume change immediately
        this.setVolume(this.settings.volume);

        // Update output labels
        $('#tts_webui_volume_output').text(this.settings.volume);
        $('#tts_webui_desired_length_output').text(this.settings.desired_length);
        $('#tts_webui_max_length_output').text(this.settings.max_length);
        $('#tts_webui_exaggeration_output').text(this.settings.exaggeration);
        $('#tts_webui_cfg_weight_output').text(this.settings.cfg_weight);
        $('#tts_webui_temperature_output').text(this.settings.temperature);
        $('#tts_webui_tokens_per_slice_output').text(this.settings.tokens_per_slice);
        $('#tts_webui_remove_milliseconds_output').text(this.settings.remove_milliseconds);
        $('#tts_webui_remove_milliseconds_start_output').text(this.settings.remove_milliseconds_start);
        $('#tts_webui_max_new_tokens_output').text(this.settings.max_new_tokens);
        $('#tts_webui_max_cache_len_output').text(this.settings.max_cache_len);

        saveTtsProviderSettings();
    }

    async checkReady() {
        await this.fetchTtsVoiceObjects();
    }

    async onRefreshClick() {
        await this.fetchTtsVoiceObjects();
        console.info('TTS voices refreshed');
    }

    async getVoice(voiceName) {
        if (this.voices.length == 0) {
            this.voices = await this.fetchTtsVoiceObjects();
        }
        const match = this.voices.filter(
            oaicVoice => oaicVoice.name == voiceName,
        )[0];
        if (!match) {
            throw `TTS Voice name ${voiceName} not found`;
        }
        return match;
    }

    async generateTts(text, voiceId) {
        const response = await this.fetchTtsGeneration(text, voiceId);

        if (this.settings.streaming) {
            // Stream audio in real-time
            await this.processStreamingAudio(response);
            // Return empty string since audio is already played via AudioWorklet
            return '';
        }

        return response;
    }

    async fetchTtsVoiceObjects() {
        // Try to fetch voices from the provider endpoint
        try {
            const voicesEndpoint = this.settings.provider_endpoint.replace('/speech', '/voices/' + this.settings.model);
            const voiceHeaders = {};
            if (this.settings.api_key) {
                voiceHeaders['Authorization'] = `Bearer ${this.settings.api_key}`;
            }
            const response = await fetch(voicesEndpoint, { headers: voiceHeaders });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const responseJson = await response.json();
            console.info('Discovered voices from provider:', responseJson);

            this.voices = responseJson.voices.map(({ value, label }) => ({
                name: label,
                voice_id: value,
                lang: 'en-US',
            }));

            return this.voices;
        } catch (error) {
            console.warn('Voice discovery failed, using configured voices:', error);
        }

        // Fallback to configured voices
        this.voices = this.settings.available_voices.map(name => ({
            name, voice_id: name, lang: 'en-US',
        }));

        return this.voices;
    }

    async initAudioWorklet(wavSampleRate) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: wavSampleRate });

        // Load the PCM processor from separate file
        const processorUrl = './scripts/extensions/third-party/sillytavern-extension-tts-webui/lib/pcm-processor.js';
        await this.audioContext.audioWorklet.addModule(processorUrl);
        this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
        this.audioWorkletNode.connect(this.audioContext.destination);
    }

    async processStreamingAudio(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        function isWorkletSupported() {
            return !!(window.AudioWorkletNode && window.AudioContext);
        }

        function getSupportedMode(settingsMode) {
            if (settingsMode === 'worklet' && !isWorkletSupported()) {
                return 'blob';
            }
            return settingsMode;
        }
        const mode = getSupportedMode(this.settings.streaming_mode || 'worklet');

        switch (mode) {
            case 'worklet':
                await this.streamToAudioWorklet(response);
                break;
            // case 'html5':
            //     // tts-webui.js:588 Uncaught (in promise) NotSupportedError: Failed to execute 'addSourceBuffer' on 'MediaSource': The type provided ('audio/wav; codecs=1') is unsupported.
            //     await this.streamToHtml5Audio(response);
            //     break;
            case 'blob':
                await this.streamToBlobUrl(response);
                break;
            default:
                throw new Error(`Unknown playback mode: ${mode}`);
        }
    }

    parseWavHeader(buffer) {
        const view = new DataView(buffer);
        // Sample rate is at bytes 24-27 (little endian)
        const sampleRate = view.getUint32(24, true);
        // Number of channels is at bytes 22-23 (little endian)
        const channels = view.getUint16(22, true);
        // Bits per sample is at bytes 34-35 (little endian)
        const bitsPerSample = view.getUint16(34, true);

        return { sampleRate, channels, bitsPerSample };
    }

    async streamToAudioWorklet(response) {
        const reader = response.body.getReader();
        let headerParsed = false;
        let wavInfo = null;

        const processStream = async ({ done, value }) => {
            if (done) {
                return;
            }

            if (!headerParsed) {
                // Parse WAV header to get sample rate
                wavInfo = this.parseWavHeader(value.buffer);
                console.log('WAV Info:', wavInfo);

                // Initialize AudioWorklet with correct sample rate
                await this.initAudioWorklet(wavInfo.sampleRate);

                // Skip WAV header (first 44 bytes typically)
                const pcmData = value.slice(44);
                this.audioWorkletNode.port.postMessage({ pcmData });
                headerParsed = true;

                const next = await reader.read();
                return processStream(next);
            }

            // Send PCM data to AudioWorklet for immediate playback
            this.audioWorkletNode.port.postMessage({ pcmData: value });
            const next = await reader.read();
            return processStream(next);
        };

        const firstChunk = await reader.read();
        await processStream(firstChunk);
    }

    async streamToHtml5Audio(response) {
        const mediaSource = new MediaSource();
        const audioElement = document.createElement('audio');
        audioElement.controls = true;
        audioElement.src = URL.createObjectURL(mediaSource);
        document.body.appendChild(audioElement);

        await new Promise((resolve) => {
            mediaSource.addEventListener('sourceopen', async () => {
                const sourceBuffer = mediaSource.addSourceBuffer('audio/wav; codecs=1');
                const reader = response.body.getReader();

                const pump = async () => {
                    const { done, value } = await reader.read();
                    if (done) {
                        mediaSource.endOfStream();
                        resolve();
                        return;
                    }
                    await new Promise(r => {
                        sourceBuffer.addEventListener('updateend', r, { once: true });
                        sourceBuffer.appendBuffer(value);
                    });
                    await pump();
                };
                await pump();
            }, { once: true });
        });

        audioElement.play();
    }

    async streamToBlobUrl(response) {
        const chunks = [];
        const reader = response.body.getReader();
        let audio = null;
        let cumulativeDuration = 0;
        const headerChunkSize = 44; // Standard WAV header size
        const splitChunkSize = 65529; // 64kb - 7 bytes due to uvicorn streaming implementation

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            console.log(`Received chunk of size ${value.length}, total chunks: ${chunks.length}`);

            if (value.length === headerChunkSize || value.length === splitChunkSize) {
                // Skip processing for header-only or split chunks
                continue;
            }

            // Capture current audio's full duration if it exists and is valid
            if (hasValidAudioDuration(audio)) {
                cumulativeDuration = audio.duration;
                console.log(`Captured duration: ${cumulativeDuration}s from chunk ${chunks.length - 1}`);
            }
            
            // Create blob with ALL chunks accumulated so far
            const blob = new Blob(chunks, { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            
            // Create new audio element
            const newAudio = new Audio(url);
            newAudio.controls = true;
            newAudio.volume = Math.min(this.currentVolume, 1.0); // HTML audio element max is 1.0
            document.body.appendChild(newAudio);
            
            // Wait for metadata to load before we can use duration/seek
            await new Promise(resolve => {
                newAudio.addEventListener('loadedmetadata', resolve, { once: true });
            });
            
            if (audio && cumulativeDuration > 0) {
                // Skip to where the previous audio left off
                newAudio.currentTime = cumulativeDuration;
                console.log(`Seeking to ${cumulativeDuration}s in chunk ${chunks.length} (total duration: ${newAudio.duration}s)`);
                
                // Chain: play next audio when current ends
                audio.addEventListener('ended', () => {
                    newAudio.play();
                    console.log(`Chained to chunk ${chunks.length}`);
                });
            } else {
                // First audio, play immediately
                newAudio.play();
                console.log(`Started playing chunk ${chunks.length}`);
            }
            
            audio = newAudio;
        }

        function hasValidAudioDuration(audio) {
            return audio && audio.duration && isFinite(audio.duration);
        }
    }

    async previewTtsVoice(voiceId) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;

        const text = getPreviewString('en-US');
        const response = await this.fetchTtsGeneration(text, voiceId);

        if (this.settings.streaming) {
            // Use shared streaming method
            await this.processStreamingAudio(response);
        } else {
            // For non-streaming, response is a fetch Response object
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const audio = await response.blob();
            const url = URL.createObjectURL(audio);
            this.audioElement.src = url;
            this.audioElement.play();
            this.audioElement.onended = () => URL.revokeObjectURL(url);
        }
    }

    async fetchTtsGeneration(inputText, voiceId) {
        console.info(`Generating new TTS for voice_id ${voiceId}`);

        const settings = this.settings;
        const streaming = settings.streaming;

        const chatterboxParams = [
            'desired_length',
            'max_length',
            'halve_first_chunk',
            'exaggeration',
            'cfg_weight',
            'temperature',
            'device',
            'dtype',
            'cpu_offload',
            'chunked',
            'cache_voice',
            'tokens_per_slice',
            'remove_milliseconds',
            'remove_milliseconds_start',
            'chunk_overlap_method',
            'seed',
            // 'use_compilation',
            'initial_forward_pass_backend',
            'generate_token_backend',
            'model_name',
            'language_id',
            'max_new_tokens',
            'max_cache_len',
        ];
        const getParams = settings => Object.fromEntries(
            Object.entries(settings).filter(([key]) =>
                chatterboxParams.includes(key),
            ),
        );

        const requestBody = {
            model: settings.model,
            voice: voiceId,
            input: inputText,
            response_format: 'wav',
            speed: settings.speed,
            stream: streaming,
            params: getParams(settings),
        };

        const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': streaming ? 'no-cache' : undefined,
        };

        if (streaming) {
            headers['Cache-Control'] = 'no-cache';
        }

        if (settings.api_key) {
            headers['Authorization'] = `Bearer ${settings.api_key}`;
        }

        const response = await fetch(settings.provider_endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            toastr.error(response.statusText, 'TTS Generation Failed');
            throw new Error(
                `HTTP ${response.status}: ${await response.text()}`,
            );
        }

        return response;
    }

    setVolume(volume) {
        // Clamp volume between 0.0 and 2.0 (0% to 200%)
        this.currentVolume = Math.max(0, Math.min(2.0, volume));

        // Set volume for regular audio element (non-streaming)
        this.audioElement.volume = Math.min(this.currentVolume, 1.0); // HTML audio element max is 1.0

        // Set volume for AudioWorklet (streaming)
        if (this.audioWorkletNode) {
            this.audioWorkletNode.port.postMessage({ volume: this.currentVolume });
        }
    }
}
