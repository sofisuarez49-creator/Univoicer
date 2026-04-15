    const VIDEOS = [];
    let AUTO_MARATHON_PLAYLIST = {
      id: 'auto-todos',
      name: 'Auto • Todos los personajes',
      source: 'auto',
      videoIds: []
    };
    const firebaseConfig = {
      apiKey: 'AIzaSyD7Hn2RHrDQRlUB-XcPtsDQ8WzWQ-q426Y',
      authDomain: 'univoicer-580d6.firebaseapp.com',
      databaseURL: 'https://univoicer-580d6-default-rtdb.firebaseio.com',
      projectId: 'univoicer-580d6',
      storageBucket: 'univoicer-580d6.firebasestorage.app',
      messagingSenderId: '732222737914',
      appId: '1:732222737914:web:80df5bef1843219f81a843',
      measurementId: 'G-BPKPZTJDTY'
    };

    const state = {
      view: 'map',
      universe: null,
      filters: { personaje: 'todos', actor: 'todos', rareza: 'todos' },
      search: { personaje: '', actor: '' },
      selectedVideoId: null,
      actorFocus: null,
      actorLetterFilter: '',
      actorLetterFilterExpanded: false,
      actorTierFiltersExpanded: false,
      actorTierFilters: {
        platinado: false,
        consagrado: false,
        destacado: false,
        desbloqueado: false,
        bloqueado: false
      },
      actorDetailsExpanded: false,
      actorRenameModalOpen: false,
      showAddForm: false,
      universeAddMode: 'video',
      showEditUniverseForm: false,
      editUniverseFeedback: { type: '', text: '' },
      marathon: {
        playlists: [],
        activePlaylistId: 'auto',
        queue: [],
        position: 0,
        isPlaying: false,
        shuffleEnabled: false,
        createModalOpen: false
      },
      universeNodes: [],
      universeMemberships: {},
      mapCanvas: { width: 1400, height: 900 },
      mapViewport: { scale: 1, centroidX: 0, centroidY: 0 },
      blockedCharactersByActor: {},
      characterProfileId: null,
      indiceSearch: '',
      indiceFilters: { universe: 'todos', actor: 'todos' },
      indiceCharacterFocus: null,
      showAddCharacterForm: false,
      draftCharacterActors: [],
      draftCharacterFeedback: '',
      indicePreviewTimer: null,
      indicePreviewCharacter: '',
      indicePreviewAnchor: null,
      indiceCollapsedRarities: new Set(),
      showCharacterInlineEdit: false,
      showCharacterInlineDelete: false,
      expandedUniverses: new Set(),
      mapWorldFilter: 'universe',
      mapAbsorptionEffect: null,
      favoriteUniverses: new Set(),
      showInteruniversalConnections: false,
      audioLibrary: {
        voces: [],
        fondos: []
      },
      uploadStatusByCategory: {
        voces: { loading: false, error: '', success: '' },
        fondos: { loading: false, error: '', success: '' }
      }
    };
    const UNIVERSES_STORAGE_KEY = 'universes_map_v1';
    const VIDEOS_STORAGE_KEY = 'videos_collection_v1';
    const COLLECTION_MODEL_STORAGE_KEY = 'collection_model_v1';
    const MARATHON_STORAGE_KEY = 'marathon_state_v1';
    const BLOCKED_CHARACTERS_STORAGE_KEY = 'blocked_characters_by_actor_v1';
    const AUDIO_LIBRARY_STORAGE_KEY = 'audio_library_v1';
    const UNIVERSE_MEMBERSHIPS_STORAGE_KEY = 'universe_memberships_v1';
    const UNIVERSES_UPDATED_AT_KEY = 'universes_updated_at_v1';
    const CLOUD_STORAGE_PATH = 'univoicerData/main';
    const SPECIAL_UNASSIGNED_UNIVERSE = 'Sin universo';
    const MAX_LOCAL_IMAGE_BYTES = 2 * 1024 * 1024;
    const NODE_HALF_WIDTH = 91;
    const NODE_HALF_HEIGHT = 103;
    const WORLD_NODE_HALF_WIDTH = 71;
    const WORLD_NODE_HALF_HEIGHT = 82;
    const WORLD_ORBIT_BASE_RADIUS = 190;
    const WORLD_ORBIT_MIN_CENTER_DISTANCE = 230;
    let firebaseDb = null;
    let firebaseStorage = null;
    let cloudSyncTimer = null;
    let collectionModel = {
      actors: [],
      characters: [],
      universes: [],
      videos: []
    };

    let marathonPlayer = null;
    let marathonPlayerReady = false;
    let marathonPlayerApiPromise = null;

    const appLayout = document.getElementById('appLayout');
    const toggleSidebar = document.getElementById('toggleSidebar');
    const navUniverses = document.getElementById('navUniverses');
    const navIndice = document.getElementById('navIndice');
    const navActores = document.getElementById('navActores');
    const navMaraton = document.getElementById('navMaraton');
    const viewInicio = document.getElementById('viewInicio');
    const viewMap = document.getElementById('viewMap');
    const viewUniverse = document.getElementById('viewUniverse');
    const viewCollection = document.getElementById('viewCollection');
    const viewIndice = document.getElementById('viewIndice');
    const viewMaraton = document.getElementById('viewMaraton');
    const viewRarezas = document.getElementById('viewRarezas');
    const viewActores = document.getElementById('viewActores');
    const viewVersiones = document.getElementById('viewVersiones');
    const viewAchievements = document.getElementById('viewAchievements');
    const viewFavoritos = document.getElementById('viewFavoritos');
    const viewBuscar = document.getElementById('viewBuscar');
    const viewStats = document.getElementById('viewStats');
    const viewConfig = document.getElementById('viewConfig');
    const viewCharacterProfile = document.getElementById('viewCharacterProfile');

    function rarityClass(rareza) {
      return `rare-${rareza.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`;
    }

    function rarityRank(rareza) {
      const normalized = String(rareza || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const order = { comun: 0, raro: 1, epico: 2, legendario: 3 };
      return Object.prototype.hasOwnProperty.call(order, normalized) ? order[normalized] : -1;
    }

    function highestRarityForActorCharacter(actorName, characterName) {
      const labels = ['Común', 'Raro', 'Épico', 'Legendario'];
      let maxRank = -1;

      for (const video of VIDEOS) {
        if ((video.actor_de_doblaje || 'Sin actor') === actorName &&
            (video.personaje || 'Sin personaje') === characterName) {
          const rank = rarityRank(video.rareza || 'Común');
          if (rank > maxRank) maxRank = rank;
        }
      }

      return maxRank >= 0 ? labels[maxRank] : 'Bloqueado';
    }

    function rarityColorValue(rareza) {
      const normalized = String(rareza || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized === 'legendario') return '#f4c45a';
      if (normalized === 'epico') return '#b786ff';
      if (normalized === 'raro') return '#5da8ff';
      if (normalized === 'comun') return '#52d88a';
      return '#8cb8ff';
    }

    function calculateActorTier({ entriesCount = 0, videosCount = 0, charactersCount = 0 } = {}) {
      if (videosCount <= 0) return 'bloqueado';
      if (entriesCount > 0 && videosCount === entriesCount && entriesCount >= 6) return 'platinado';
      if (videosCount >= 10 || charactersCount >= 12) return 'consagrado';
      if (videosCount >= 4 || charactersCount >= 6) return 'destacado';
      return 'desbloqueado';
    }

    function toEmbedUrl(url, autoplay = 0) {
      const id = getYoutubeId(url);
      return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=${autoplay}&enablejsapi=1`;
    }

    function hasGreetingVideo(video) {
      return Boolean(getYoutubeId(video?.url_youtube || ''));
    }

    const ACTOR_PLATINADO_THRESHOLD = 6;
    const ACTOR_TIERS = {
      bloqueado: { key: 'bloqueado', label: 'Bloqueado', rank: 0 },
      desbloqueado: { key: 'desbloqueado', label: 'Desbloqueado', rank: 1 },
      destacado: { key: 'destacado', label: 'Destacado', rank: 2 },
      consagrado: { key: 'consagrado', label: 'Consagrado', rank: 3 },
      platinado: { key: 'platinado', label: 'Platinado', rank: 4 }
    };

    function getActorTier(unlockedCount) {
      const safeUnlockedCount = Number(unlockedCount) || 0;
      if (safeUnlockedCount > ACTOR_PLATINADO_THRESHOLD) return ACTOR_TIERS.platinado;
      if (safeUnlockedCount === 4) return ACTOR_TIERS.consagrado;
      if (safeUnlockedCount >= 2) return ACTOR_TIERS.destacado;
      if (safeUnlockedCount === 1) return ACTOR_TIERS.desbloqueado;
      return ACTOR_TIERS.bloqueado;
    }

    function groupByUniverse() {
      const grouped = VIDEOS.reduce((acc, item) => {
        const universes = Array.isArray(item.universo) ? item.universo : [item.universo];
        universes.filter(Boolean).forEach((rawName) => {
          const key = normalizeUniverseName(rawName);
          if (!key) return;
          if (!acc[key]) {
            const cleanName = String(rawName || '').trim() || 'Sin universo';
            acc[key] = {
              name: cleanName,
              allVideosCount: 0,
              unlockedVideosCount: 0,
              charactersNames: new Set(),
              videos: []
            };
          }

          // Incrementamos el total de videos de este universo
          acc[key].allVideosCount++;
          acc[key].videos.push(item);

          // Si tiene YouTube, es un video desbloqueado
          if (hasGreetingVideo(item)) {
            acc[key].unlockedVideosCount++;
          }
          
          // Guardamos el nombre del personaje para contar UNICOS después
          const character = String(item.personaje || '').trim();
          if (character) {
            acc[key].charactersNames.add(character);
          }
        });
        return acc;
      }, {});

      return Object.fromEntries(
        Object.entries(grouped).map(([key, data]) => {
          const totalCharacters = data.charactersNames.size; // Todos (bloqueados o no)
          const unlockedVideos = data.unlockedVideosCount;   // Solo con link
          
          // La barra de progreso suele basarse en videos desbloqueados vs total videos
          const completion = data.allVideosCount ? Math.round((unlockedVideos / data.allVideosCount) * 100) : 0;
          
          return [key, {
            name: data.name,
            totalCharacters: totalCharacters, // <--- Este es el que va en "Personajes"
            unlockedVideos: unlockedVideos,   // <--- Este es el que va en "Video"
            completion,
            state: completion === 100 ? 'complete' : (completion > 0 ? 'advanced' : 'incomplete'),
            videos: data.videos
          }];
        })
      );
    }

    function normalizeEntityName(name) {
      return String(name || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    function createModelId(prefix, value) {
      const base = cssSafe(String(value || '').trim() || `${prefix}-${Date.now()}`);
      return `${prefix}-${base || Date.now()}`;
    }

    function createEmptyCollectionModel() {
      return {
        actors: [],
        characters: [],
        universes: [],
        videos: [],
        worldMemberships: []
      };
    }

    function parseModelFromStorage(rawModel) {
      if (!rawModel || typeof rawModel !== 'object') return null;
      if (!Array.isArray(rawModel.actors) || !Array.isArray(rawModel.characters) || !Array.isArray(rawModel.universes) || !Array.isArray(rawModel.videos)) {
        return null;
      }
      const rawUniverseIds = new Set(
        rawModel.universes
          .filter(Boolean)
          .map(item => String(item.id || ''))
          .filter(Boolean)
      );
      return {
        actors: rawModel.actors.filter(Boolean).map(item => ({
          id: String(item.id || ''),
          name: String(item.name || 'Sin actor'),
          characterIds: Array.isArray(item.characterIds) ? [...new Set(item.characterIds.filter(Boolean).map(String))] : []
        })),
        characters: rawModel.characters.filter(Boolean).map(item => ({
          id: String(item.id || ''),
          name: String(item.name || 'Sin personaje'),
          actorIds: Array.isArray(item.actorIds) ? [...new Set(item.actorIds.filter(Boolean).map(String))] : [],
          universeIds: Array.isArray(item.universeIds) ? [...new Set(item.universeIds.filter(Boolean).map(String))] : [],
          videoIds: Array.isArray(item.videoIds) ? [...new Set(item.videoIds.filter(Boolean).map(String))] : [],
          unlocked: Boolean(item.unlocked)
        })),
        universes: rawModel.universes.filter(Boolean).map(item => ({
          id: String(item.id || ''),
          name: String(item.name || 'Sin universo'),
          characterIds: Array.isArray(item.characterIds) ? [...new Set(item.characterIds.filter(Boolean).map(String))] : [],
          kind: item.kind === 'world' ? 'world' : 'universe',
          parentUniverseIds: Array.isArray(item.parentUniverseIds) ? [...new Set(item.parentUniverseIds.filter(Boolean).map(String))] : []
        })),
        videos: rawModel.videos.filter(Boolean).map(item => ({
          id: String(item.id || ''),
          youtubeUrl: String(item.youtubeUrl || ''),
          title: String(item.title || ''),
          thumbnail: String(item.thumbnail || ''),
          characterId: String(item.characterId || ''),
          actorId: String(item.actorId || ''),
          universeIds: Array.isArray(item.universeIds) ? [...new Set(item.universeIds.filter(Boolean).map(String))] : []
        })),
        worldMemberships: Array.isArray(rawModel.worldMemberships)
          ? rawModel.worldMemberships
            .filter(Boolean)
            .map(item => ({
              worldUniverseId: String(item.worldUniverseId || ''),
              parentUniverseId: String(item.parentUniverseId || '')
            }))
            .filter(item => item.worldUniverseId && item.parentUniverseId)
            .filter(item => rawUniverseIds.has(item.worldUniverseId) && rawUniverseIds.has(item.parentUniverseId))
          : []
      };
    }

    function saveCollectionModel() {
      localStorage.setItem(COLLECTION_MODEL_STORAGE_KEY, JSON.stringify(collectionModel));
      scheduleCloudSync();
    }

    function loadCollectionModelFromStorage() {
      try {
        const raw = localStorage.getItem(COLLECTION_MODEL_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parseModelFromStorage(parsed);
      } catch (_) {
        return null;
      }
    }

    function getOrCreateActor(model, actorName, actorMap) {
      const normalized = normalizeEntityName(actorName || 'Sin actor');
      if (actorMap.has(normalized)) return actorMap.get(normalized);
      const actor = { id: createModelId('actor', normalized), name: (actorName || 'Sin actor').trim() || 'Sin actor', characterIds: [] };
      model.actors.push(actor);
      actorMap.set(normalized, actor);
      return actor;
    }

    function getOrCreateCharacter(model, characterName, characterMap) {
      const normalized = normalizeEntityName(characterName || 'Sin personaje');
      if (characterMap.has(normalized)) return characterMap.get(normalized);
      const character = { id: createModelId('character', normalized), name: (characterName || 'Sin personaje').trim() || 'Sin personaje', actorIds: [], universeIds: [], videoIds: [], unlocked: false };
      model.characters.push(character);
      characterMap.set(normalized, character);
      return character;
    }

    function getOrCreateUniverse(model, universeName, universeMap) {
      const normalized = normalizeEntityName(universeName || 'Sin universo');
      if (universeMap.has(normalized)) return universeMap.get(normalized);
      const universe = {
        id: createModelId('universe', normalized),
        name: (universeName || 'Sin universo').trim() || 'Sin universo',
        characterIds: [],
        kind: 'universe',
        parentUniverseIds: []
      };
      model.universes.push(universe);
      universeMap.set(normalized, universe);
      return universe;
    }

    function linkActorCharacter(actorId, characterId, model = collectionModel) {
      const actor = model.actors.find(item => item.id === actorId);
      const character = model.characters.find(item => item.id === characterId);
      if (!actor || !character) return;
      if (!actor.characterIds.includes(characterId)) actor.characterIds.push(characterId);
      if (!character.actorIds.includes(actorId)) character.actorIds.push(actorId);
    }

    function linkCharacterUniverse(characterId, universeId, model = collectionModel) {
      const character = model.characters.find(item => item.id === characterId);
      const universe = model.universes.find(item => item.id === universeId);
      if (!character || !universe) return;
      if (!character.universeIds.includes(universeId)) character.universeIds.push(universeId);
      if (!universe.characterIds.includes(characterId)) universe.characterIds.push(characterId);
    }

    function addVideoAndUnlockCharacter(videoPayload, model = collectionModel) {
      const video = {
        id: String(videoPayload.id || `video-${Date.now()}`),
        youtubeUrl: String(videoPayload.youtubeUrl || ''),
        title: String(videoPayload.title || ''),
        thumbnail: String(videoPayload.thumbnail || ''),
        characterId: String(videoPayload.characterId || ''),
        actorId: String(videoPayload.actorId || ''),
        universeIds: Array.isArray(videoPayload.universeIds) ? [...new Set(videoPayload.universeIds.filter(Boolean).map(String))] : []
      };
      model.videos.push(video);
      const character = model.characters.find(item => item.id === video.characterId);
      if (character) {
        if (!character.videoIds.includes(video.id)) character.videoIds.push(video.id);
        character.unlocked = true;
      }
      return video;
    }

    function migrateLegacyVideosToModel(legacyVideos) {
      const model = createEmptyCollectionModel();
      const actorMap = new Map();
      const characterMap = new Map();
      const universeMap = new Map();

      (legacyVideos || []).forEach((video, idx) => {
        const actor = getOrCreateActor(model, video?.actor_de_doblaje || 'Sin actor', actorMap);
        const character = getOrCreateCharacter(model, video?.personaje || 'Sin personaje', characterMap);
        linkActorCharacter(actor.id, character.id, model);
        const universeIds = getVideoUniverses(video).filter(Boolean).map((universeName) => {
          const universe = getOrCreateUniverse(model, universeName, universeMap);
          linkCharacterUniverse(character.id, universe.id, model);
          return universe.id;
        });
        addVideoAndUnlockCharacter({
          id: video?.id || `video-legacy-${idx + 1}`,
          youtubeUrl: video?.url_youtube || video?.url_video || '',
          title: video?.titulo || '',
          thumbnail: video?.thumbnail || '',
          characterId: character.id,
          actorId: actor.id,
          universeIds
        }, model);
      });
      return model;
    }

    function mergeModelWithLegacyVideos(currentModel, legacyVideos) {
      const baseModel = parseModelFromStorage(currentModel) || createEmptyCollectionModel();
      const model = {
        actors: baseModel.actors.map((actor) => ({ ...actor, characterIds: Array.isArray(actor.characterIds) ? [...new Set(actor.characterIds)] : [] })),
        characters: baseModel.characters.map((character) => ({
          ...character,
          actorIds: Array.isArray(character.actorIds) ? [...new Set(character.actorIds)] : [],
          universeIds: Array.isArray(character.universeIds) ? [...new Set(character.universeIds)] : [],
          videoIds: [],
          unlocked: false
        })),
        universes: baseModel.universes.map((universe) => ({
          ...universe,
          characterIds: Array.isArray(universe.characterIds) ? [...new Set(universe.characterIds)] : [],
          kind: universe.kind === 'world' ? 'world' : 'universe',
          parentUniverseIds: Array.isArray(universe.parentUniverseIds) ? [...new Set(universe.parentUniverseIds)] : []
        })),
        videos: [],
        worldMemberships: Array.isArray(baseModel.worldMemberships)
          ? baseModel.worldMemberships
            .filter(Boolean)
            .map((item) => ({
              worldUniverseId: String(item.worldUniverseId || ''),
              parentUniverseId: String(item.parentUniverseId || '')
            }))
            .filter((item) => item.worldUniverseId && item.parentUniverseId)
          : []
      };

      const actorMap = new Map(model.actors.map((actor) => [normalizeEntityName(actor.name), actor]));
      const characterMap = new Map(model.characters.map((character) => [normalizeEntityName(character.name), character]));
      const universeMap = new Map(model.universes.map((universe) => [normalizeEntityName(universe.name), universe]));

      (legacyVideos || []).forEach((video, idx) => {
        const actor = getOrCreateActor(model, video?.actor_de_doblaje || 'Sin actor', actorMap);
        const character = getOrCreateCharacter(model, video?.personaje || 'Sin personaje', characterMap);
        linkActorCharacter(actor.id, character.id, model);

        const universeIds = getVideoUniverses(video).filter(Boolean).map((universeName) => {
          const universe = getOrCreateUniverse(model, universeName, universeMap);
          linkCharacterUniverse(character.id, universe.id, model);
          return universe.id;
        });

        addVideoAndUnlockCharacter({
          id: video?.id || `video-legacy-${idx + 1}`,
          youtubeUrl: video?.url_youtube || video?.url_video || '',
          title: video?.titulo || '',
          thumbnail: video?.thumbnail || '',
          characterId: character.id,
          actorId: actor.id,
          universeIds
        }, model);
      });

      return model;
    }

    function normalizeUniverseName(name) {
      return String(name || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    }

    function isUnassignedUniverseName(name) {
      const normalized = normalizeUniverseName(name);
      return !normalized
        || normalized === normalizeUniverseName(SPECIAL_UNASSIGNED_UNIVERSE)
        || normalized === normalizeUniverseName('Sin universos')
        || normalized === normalizeUniverseName('Ninguno');
    }

    function normalizeUniverseList(rawUniverses, { fallbackToUnassigned = true } = {}) {
      const preferred = [];
      const seenPreferred = new Set();
      let hasUnassigned = false;
      (Array.isArray(rawUniverses) ? rawUniverses : [rawUniverses]).forEach((rawName) => {
        const canonicalName = String(rawName || '').trim();
        const normalizedName = normalizeUniverseName(canonicalName);
        if (isUnassignedUniverseName(canonicalName)) {
          hasUnassigned = true;
          return;
        }
        if (!normalizedName || seenPreferred.has(normalizedName)) return;
        preferred.push(canonicalName);
        seenPreferred.add(normalizedName);
      });
      if (preferred.length) return preferred;
      if (hasUnassigned && fallbackToUnassigned) return [SPECIAL_UNASSIGNED_UNIVERSE];
      return fallbackToUnassigned ? [SPECIAL_UNASSIGNED_UNIVERSE] : [];
    }

    function getCharacterUniverseList(characterName, { fallbackToUnassigned = false } = {}) {
      const normalizedCharacter = normalizeName(characterName || '');
      const rawUniverses = VIDEOS
        .filter((video) => normalizeName(video.personaje || '') === normalizedCharacter)
        .flatMap((video) => getVideoUniverses(video));
      return normalizeUniverseList(rawUniverses, { fallbackToUnassigned });
    }

    function escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function normalizeName(name) {
      return String(name || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function getActorInitialLetter(name) {
      const first = (String(name || '').trim().match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/) || [])[0] || '';
      const plain = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      return plain >= 'A' && plain <= 'Z' ? plain : '#';
    }

    function getCharacterIdByName(name) {
      return cssSafe(normalizeName(name));
    }

    function getCharacterNameById(characterId) {
      if (!characterId) return '';
      const modelCharacter = (collectionModel.characters || [])
        .find(item => getCharacterIdByName(item.name) === characterId);
      if (modelCharacter?.name) return modelCharacter.name;
      return [...new Set(VIDEOS.map(v => String(v.personaje || '').trim()).filter(Boolean))]
        .find(name => getCharacterIdByName(name) === characterId) || '';
    }

    function createPlaceholderCover(name) {
      const label = encodeURIComponent((name || 'UNIVERSO').slice(0, 18).toUpperCase());
      return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 280'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%2359d0ff'/><stop offset='100%' stop-color='%23a78bfa'/></linearGradient></defs><rect width='400' height='280' fill='%23111a34'/><rect x='14' y='14' width='372' height='252' rx='18' fill='url(%23g)' opacity='.4'/><text x='200' y='150' font-size='30' font-family='Arial, sans-serif' text-anchor='middle' fill='white'>${label}</text></svg>`;
    }

    function createUniversePlaceholderCover() {
      return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 280'><defs><linearGradient id='space' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23050b17'/><stop offset='100%' stop-color='%23162543'/></linearGradient></defs><rect width='400' height='280' fill='url(%23space)'/><circle cx='72' cy='72' r='54' fill='%232bf7ff' opacity='.08'/><circle cx='318' cy='220' r='72' fill='%23a78bfa' opacity='.12'/><text x='200' y='160' font-size='98' font-family='Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif' text-anchor='middle'>%F0%9F%AA%90</text></svg>";
    }

    function createNoUniversePlaceholderCover() {
      return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 280'><defs><linearGradient id='space' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23050b17'/><stop offset='100%' stop-color='%23162543'/></linearGradient></defs><rect width='400' height='280' fill='url(%23space)'/><circle cx='306' cy='72' r='56' fill='%232bf7ff' opacity='.08'/><circle cx='84' cy='214' r='70' fill='%23a78bfa' opacity='.12'/><text x='200' y='160' font-size='96' font-family='Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif' text-anchor='middle'>%F0%9F%8C%8C</text></svg>";
    }

    function isLegacyGeneratedUniverseCover(cover) {
      const rawCover = String(cover || '').trim();
      if (!rawCover.startsWith('data:image/svg+xml;utf8,')) return false;
      return rawCover.includes("id='g'") && rawCover.includes("font-size='30'");
    }

    function getSafeUniverseCover(name, cover) {
      const normalizedCover = String(cover || '').trim();
      const effectiveCover = isLegacyGeneratedUniverseCover(normalizedCover) ? '' : normalizedCover;
      if (normalizeUniverseName(name) === normalizeUniverseName('Sin universo')) {
        return effectiveCover || createNoUniversePlaceholderCover();
      }
      return effectiveCover || createUniversePlaceholderCover();
    }

    function getProgressVisual(completion = 0) {
      const value = Number(completion) || 0;
      if (value >= 100) return { color: '#31d665' };
      if (value >= 66) return { color: '#2f82ff' };
      if (value >= 25) return { color: '#ffcc33' };
      return { color: '#ff4f4f' };
    }

    function validateCoverUrl(urlText) {
      if (!urlText?.trim()) return '';
      try {
        const parsed = new URL(urlText.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Protocolo no permitido');
        }
        return parsed.toString();
      } catch (_) {
        throw new Error('La URL de portada no es válida');
      }
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No fue posible leer la imagen local.'));
        reader.readAsDataURL(file);
      });
    }

    function normalizeCustomMarathonPlaylist(rawPlaylist) {
      if (!rawPlaylist || typeof rawPlaylist !== 'object') return null;
      const name = String(rawPlaylist.name || '').trim();
      const playlistId = String(rawPlaylist.id || '').trim();
      const source = String(rawPlaylist.source || '').trim();
      const isExplicitCustom = source === 'custom';
      const isLegacyCustomId = playlistId.startsWith('custom:');
      const videoIds = Array.isArray(rawPlaylist.videoIds)
        ? [...new Set(rawPlaylist.videoIds.map((id) => String(id || '').trim()).filter(Boolean))]
        : [];
      if (!name || !playlistId || !videoIds.length || (!isExplicitCustom && !isLegacyCustomId)) return null;
      return {
        id: playlistId,
        name,
        cover: String(rawPlaylist.cover || '').trim(),
        source: 'custom',
        videoIds
      };
    }

    function getCustomMarathonPlaylists() {
      return (state.marathon.playlists || [])
        .map(normalizeCustomMarathonPlaylist)
        .filter(Boolean);
    }

    function saveMarathonState() {
      const payload = {
        activePlaylistId: String(state.marathon.activePlaylistId || 'auto'),
        shuffleEnabled: Boolean(state.marathon.shuffleEnabled),
        customPlaylists: getCustomMarathonPlaylists()
      };
      localStorage.setItem(MARATHON_STORAGE_KEY, JSON.stringify(payload));
    }

    function loadMarathonStateFromStorage() {
      try {
        const raw = localStorage.getItem(MARATHON_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const customPlaylists = Array.isArray(parsed?.customPlaylists)
          ? parsed.customPlaylists.map(normalizeCustomMarathonPlaylist).filter(Boolean)
          : [];
        state.marathon.playlists = customPlaylists;
        state.marathon.activePlaylistId = String(parsed?.activePlaylistId || state.marathon.activePlaylistId || 'auto');
        state.marathon.shuffleEnabled = Boolean(parsed?.shuffleEnabled);
      } catch (err) {
        console.warn('No se pudo leer el estado de maratón desde almacenamiento local.', err);
      }
    }

    function saveUniverseNodes() {
      localStorage.setItem(UNIVERSES_STORAGE_KEY, JSON.stringify(state.universeNodes));
      localStorage.setItem(UNIVERSES_UPDATED_AT_KEY, String(Date.now()));
      scheduleCloudSync();
    }

    function getLocalUniversesUpdatedAt() {
      const rawUpdatedAt = Number(localStorage.getItem(UNIVERSES_UPDATED_AT_KEY));
      return Number.isFinite(rawUpdatedAt) ? rawUpdatedAt : 0;
    }

    function syncFavoriteUniverseSetFromNodes() {
      state.favoriteUniverses = new Set(
        (state.universeNodes || [])
          .filter((node) => node?.isFavorite)
          .map((node) => node.name)
      );
    }

    function getUniverseParentId(nodeId) {
      const normalizedId = String(nodeId || '').trim();
      if (!normalizedId) return '';
      const node = state.universeNodes.find((item) => item.id === normalizedId);
      const explicitParentId = String(node?.parentUniverseId || '').trim();
      if (explicitParentId) return explicitParentId;
      return String(state.universeMemberships?.[normalizedId] || '').trim();
    }

    function wouldCreateUniverseCycle(childId, parentId) {
      const normalizedChildId = String(childId || '').trim();
      const normalizedParentId = String(parentId || '').trim();
      if (!normalizedChildId || !normalizedParentId) return false;
      if (normalizedChildId === normalizedParentId) return true;
      const visited = new Set([normalizedParentId]);
      let currentId = normalizedParentId;
      while (currentId) {
        const nextParentId = getUniverseParentId(currentId);
        if (!nextParentId) return false;
        if (nextParentId === normalizedChildId) return true;
        if (visited.has(nextParentId)) {
          // Evita bloquear reasignaciones válidas por un ciclo preexistente
          // en otra rama; este chequeo solo debe detectar si el hijo quedaría
          // dentro de su propia cadena de ancestros.
          return false;
        }
        visited.add(nextParentId);
        currentId = nextParentId;
      }
      return false;
    }

    function nodeHasChildren(nodeId) {
      const normalizedId = String(nodeId || '').trim();
      if (!normalizedId) return false;
      return state.universeNodes.some((node) => getUniverseParentId(node.id) === normalizedId);
    }

    function normalizeUniverseMemberships(memberships, nodes = state.universeNodes) {
      const validNodeIds = new Set((Array.isArray(nodes) ? nodes : []).map((node) => String(node.id || '').trim()).filter(Boolean));
      if (!memberships || typeof memberships !== 'object') return {};
      return Object.entries(memberships).reduce((acc, [worldId, parentUniverseId]) => {
        const childId = String(worldId || '').trim();
        const parentId = String(parentUniverseId || '').trim();
        if (!childId || !parentId) return acc;
        if (childId === parentId) return acc;
        if (!validNodeIds.has(childId) || !validNodeIds.has(parentId)) return acc;
        if (wouldCreateUniverseCycle(childId, parentId)) return acc;
        acc[childId] = parentId;
        return acc;
      }, {});
    }

    function getNodeByNormalizedUniverseName(universeName) {
      const targetName = normalizeUniverseName(universeName);
      if (!targetName) return null;
      return state.universeNodes.find((node) => normalizeUniverseName(node.name) === targetName) || null;
    }

    function ensureUniverseNodeByName(universeName) {
      const cleanName = String(universeName || '').trim();
      if (!cleanName) return null;
      const existing = getNodeByNormalizedUniverseName(cleanName);
      if (existing) return existing;
      const seed = hashCode(cleanName);
      let placement = findPlacementForNode(state.universeNodes, state.mapCanvas, seed);
      let safety = 0;
      while (!placement && safety < 5) {
        state.mapCanvas.width += 360;
        state.mapCanvas.height += 240;
        placement = findPlacementForNode(state.universeNodes, state.mapCanvas, seed + safety);
        safety += 1;
      }
      const fallbackX = state.mapCanvas.width - 180 - (seed % 120);
      const fallbackY = state.mapCanvas.height - 180 - ((seed >> 3) % 120);
      const point = placement || {
        x: Math.max(160, fallbackX),
        y: Math.max(160, fallbackY),
        anchorId: state.universeNodes[0]?.id
      };
      const nodeId = cssSafe(cleanName) || createModelId('universe', cleanName);
      const nextNode = {
        id: nodeId,
        name: cleanName,
        cover: getSafeUniverseCover(cleanName, ''),
        x: point.x,
        y: point.y,
        neighbors: point.anchorId ? [point.anchorId] : [],
        shape: createNodeShape(seed),
        kind: 'universe',
        parentUniverseId: '',
        parentUniverseIds: []
      };
      state.universeNodes.push(nextNode);
      if (point.anchorId) {
        const anchor = state.universeNodes.find(node => node.id === point.anchorId);
        if (anchor && !anchor.neighbors.includes(nodeId)) anchor.neighbors.push(nodeId);
      }
      return nextNode;
    }

    function getParentUniverseIdsForNode(node) {
      if (!node) return [];
      const fromNode = Array.isArray(node.parentUniverseIds) ? node.parentUniverseIds.map(String).map((id) => id.trim()).filter(Boolean) : [];
      const primaryFromMembership = String(state.universeMemberships?.[node.id] || node.parentUniverseId || '').trim();
      if (primaryFromMembership && !fromNode.includes(primaryFromMembership)) {
        return [primaryFromMembership, ...fromNode];
      }
      return fromNode;
    }

    function saveUniverseMemberships() {
      state.universeMemberships = normalizeUniverseMemberships(state.universeMemberships);
      localStorage.setItem(UNIVERSE_MEMBERSHIPS_STORAGE_KEY, JSON.stringify(state.universeMemberships));
      scheduleCloudSync();
    }

    function loadUniverseMembershipsFromStorage() {
      try {
        const raw = localStorage.getItem(UNIVERSE_MEMBERSHIPS_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return normalizeUniverseMemberships(parsed);
      } catch (_) {
        return {};
      }
    }

    function saveBlockedCharacters() {
      localStorage.setItem(BLOCKED_CHARACTERS_STORAGE_KEY, JSON.stringify(state.blockedCharactersByActor));
      scheduleCloudSync();
    }

    function loadBlockedCharactersFromStorage() {
      try {
        const raw = localStorage.getItem(BLOCKED_CHARACTERS_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        return Object.entries(parsed).reduce((acc, [actor, list]) => {
          if (!actor?.trim()) return acc;
          acc[actor] = Array.isArray(list) ? [...new Set(list.map(item => String(item || '').trim()).filter(Boolean))] : [];
          return acc;
        }, {});
      } catch (_) {
        return {};
      }
    }

    function getVideoThumbnail(video) {
      if (video?.thumbnail) return video.thumbnail;
      return getUniverseCover([video]);
    }

    function getActorCardThumbnail(video, actorName) {
      return getVideoThumbnail(video) || createPlaceholderCover(actorName);
    }

    function getCharactersByActor(actorName) {
      const normalizedActor = normalizeEntityName(actorName);
      const modelActor = collectionModel.actors.find(item => normalizeEntityName(item.name) === normalizedActor);
      if (modelActor) {
        return modelActor.characterIds
          .map((characterId) => collectionModel.characters.find(character => character.id === characterId)?.name)
          .filter(Boolean);
      }
      return [...new Set(
        VIDEOS.filter(v => (v.actor_de_doblaje || 'Sin actor') === actorName)
          .map(v => v.personaje || 'Sin personaje')
          .filter(Boolean)
      )];
    }

    function getGlobalCharacterCollection() {
      const byCharacter = new Map();
      const register = (characterName, payload) => {
        if (!characterName) return;
        const id = cssSafe(characterName);
        const existing = byCharacter.get(id);
        byCharacter.set(id, existing ? { ...existing, ...payload } : { id, name: characterName, ...payload });
      };

      VIDEOS.forEach((video) => {
        const name = String(video.personaje || 'Sin personaje').trim();
        if (!name) return;
        register(name, {
          unlocked: true,
          actor: video.actor_de_doblaje || 'Sin actor',
          rareza: video.rareza || 'Común',
          universes: [...new Set(VIDEOS
            .filter(v => (v.personaje || 'Sin personaje') === name)
            .flatMap(v => getVideoUniverses(v))
            .filter(Boolean))],
          videoId: video.id,
          thumbnail: video.thumbnail || getVideoThumbnail(video)
        });
      });

      Object.entries(state.blockedCharactersByActor || {}).forEach(([actor, list]) => {
        (Array.isArray(list) ? list : []).forEach((characterName) => {
          const cleanName = String(characterName || '').trim();
          if (!cleanName) return;
          const id = cssSafe(cleanName);
          if (byCharacter.get(id)?.unlocked) return;
          register(cleanName, {
            unlocked: false,
            actor: actor || 'Sin actor',
            rareza: 'Bloqueado',
            universes: [],
            videoId: '',
            thumbnail: ''
          });
        });
      });

      return [...byCharacter.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

    function unlockBlockedCharacterForActor(actorName, characterName) {
      if (!actorName || !characterName) return;
      const blocked = state.blockedCharactersByActor[actorName] || [];
      const filtered = blocked.filter(item => item !== characterName);
      if (filtered.length) state.blockedCharactersByActor[actorName] = filtered;
      else delete state.blockedCharactersByActor[actorName];
      saveBlockedCharacters();
      if (state.view === 'collection') renderCollectionView();
    }

    function blockCharacterForActor(actorName, characterName) {
      if (!actorName || !characterName) return;
      const cleanActorName = String(actorName || '').trim();
      const cleanCharacterName = String(characterName || '').trim();
      if (!cleanActorName || !cleanCharacterName) return;
      const current = state.blockedCharactersByActor[cleanActorName] || [];
      state.blockedCharactersByActor[cleanActorName] = [...new Set([...current, cleanCharacterName])];
      const createdPlaceholder = ensureBlockedCharacterPlaceholder(cleanActorName, cleanCharacterName);
      saveBlockedCharacters();
      if (createdPlaceholder) saveVideos();
      if (state.view === 'collection') renderCollectionView();
    }

    function ensureBlockedCharacterPlaceholder(actorName, characterName) {
      const cleanActorName = String(actorName || '').trim();
      const cleanCharacterName = String(characterName || '').trim();
      if (!cleanActorName || !cleanCharacterName) return false;
      const normalizedActor = normalizeName(cleanActorName);
      const normalizedCharacter = normalizeName(cleanCharacterName);
      const alreadyExists = VIDEOS.some((video) => (
        normalizeName(video.actor_de_doblaje || '') === normalizedActor
        && normalizeName(video.personaje || '') === normalizedCharacter
      ));
      if (alreadyExists) return false;
      const existingCharacterEntries = VIDEOS.filter((video) => normalizeName(video.personaje || '') === normalizedCharacter);
      const inheritedUniverses = normalizeUniverseList(
        existingCharacterEntries.flatMap((item) => getVideoUniverses(item)),
        { fallbackToUnassigned: true }
      );
      const inheritedRarity = existingCharacterEntries.find((item) => item.rareza)?.rareza || 'Común';
      VIDEOS.push({
        id: `video-bloqueado-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        titulo: `Registro bloqueado de ${cleanCharacterName}`,
        universo: inheritedUniverses,
        personaje: cleanCharacterName,
        actor_de_doblaje: cleanActorName,
        url_youtube: '',
        rareza: inheritedRarity,
        thumbnail: createPlaceholderCover(cleanCharacterName)
      });
      return true;
    }

    function syncBlockedCharactersToVideoPlaceholders() {
      let created = false;
      Object.entries(state.blockedCharactersByActor || {}).forEach(([actorName, blockedList]) => {
        (Array.isArray(blockedList) ? blockedList : []).forEach((characterName) => {
          if (ensureBlockedCharacterPlaceholder(actorName, characterName)) created = true;
        });
      });
      if (created) saveVideos();
    }

    function normalizeUniverseNodes(nodes) {
      if (!Array.isArray(nodes)) return [];
      return nodes
        .filter(node => node && typeof node.name === 'string')
        .map((node, idx) => ({
          id: node.id || cssSafe(node.name) || `universo-${idx}`,
          name: node.name.trim(),
          cover: typeof node.cover === 'string' ? node.cover : '',
          x: Number(node.x) || 220 + (idx * 80),
          y: Number(node.y) || 220 + (idx * 60),
          neighbors: Array.isArray(node.neighbors) ? node.neighbors.filter(Boolean) : [],
          shape: node.shape || createNodeShape(hashCode(node.name)),
          kind: node.kind === 'world' ? 'world' : 'universe',
          parentUniverseId: String(node.parentUniverseId || '').trim(),
          parentUniverseIds: Array.isArray(node.parentUniverseIds)
            ? [...new Set(node.parentUniverseIds.filter(Boolean).map((id) => String(id).trim()).filter(Boolean))]
            : [],
          isFavorite: Boolean(node.isFavorite)
        }))
        .filter(node => node.name);
    }

    function mergeUniverseNodes(...sources) {
      const mergedByName = new Map();
      sources.forEach((source) => {
        normalizeUniverseNodes(source).forEach((node) => {
          const key = normalizeUniverseName(node.name);
          if (!key) return;
          const existing = mergedByName.get(key);
          if (!existing) {
            mergedByName.set(key, { ...node });
            return;
          }
          mergedByName.set(key, {
            ...existing,
            ...node,
            cover: node.cover || existing.cover || '',
            neighbors: [...new Set([...(existing.neighbors || []), ...(node.neighbors || [])])],
            parentUniverseIds: [...new Set([...(existing.parentUniverseIds || []), ...(node.parentUniverseIds || [])])],
            isFavorite: Boolean(existing.isFavorite || node.isFavorite)
          });
        });
      });
      return [...mergedByName.values()];
    }

    function syncCollectionModelWithVideos(preserveActorsFromModel = collectionModel) {
      const nextModel = migrateLegacyVideosToModel(VIDEOS);
      const actorNameToActor = new Map(
        (nextModel.actors || []).map((actor) => [normalizeEntityName(actor.name), actor])
      );
      (preserveActorsFromModel?.actors || []).forEach((actor) => {
        const actorName = String(actor?.name || '').trim();
        if (!actorName) return;
        const normalizedActor = normalizeEntityName(actorName);
        if (actorNameToActor.has(normalizedActor)) return;
        nextModel.actors.push({
          id: String(actor.id || createModelId('actor', normalizedActor)),
          name: actorName,
          characterIds: []
        });
        actorNameToActor.set(normalizedActor, actor);
      });
      collectionModel = nextModel;
    }

    function loadUniverseNodesFromStorage() {
      try {
        const raw = localStorage.getItem(UNIVERSES_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return normalizeUniverseNodes(parsed);
      } catch (_) {
        return [];
      }
    }

    function deduplicateUniverseNodesAndMemberships() {
      const nameToNodeIndex = new Map();
      const remappedNodeIds = {};
      const dedupedNodes = [];

      state.universeNodes.forEach((rawNode) => {
        const node = rawNode && typeof rawNode === 'object' ? { ...rawNode } : null;
        if (!node) return;
        const normalizedName = normalizeUniverseName(node.name);
        if (!normalizedName) return;
        const existingIndex = nameToNodeIndex.get(normalizedName);
        if (existingIndex === undefined) {
          nameToNodeIndex.set(normalizedName, dedupedNodes.length);
          dedupedNodes.push(node);
          return;
        }
        const primaryNode = dedupedNodes[existingIndex];
        if (node.id && node.id !== primaryNode.id) {
          remappedNodeIds[node.id] = primaryNode.id;
        }
        if (!primaryNode.cover && node.cover) primaryNode.cover = node.cover;
        if (node.kind === 'world') primaryNode.kind = 'world';
        const mergedParents = [...new Set([
          ...getParentUniverseIdsForNode(primaryNode),
          ...getParentUniverseIdsForNode(node)
        ])];
        primaryNode.parentUniverseIds = mergedParents;
        if (!primaryNode.parentUniverseId && node.parentUniverseId) {
          primaryNode.parentUniverseId = node.parentUniverseId;
        }
        primaryNode.neighbors = [...new Set([...(primaryNode.neighbors || []), ...(node.neighbors || [])])];
        primaryNode.isFavorite = Boolean(primaryNode.isFavorite || node.isFavorite);
      });

      if (!Object.keys(remappedNodeIds).length) {
        state.universeNodes = dedupedNodes;
        return;
      }

      const remapId = (value) => {
        const cleanId = String(value || '').trim();
        return remappedNodeIds[cleanId] || cleanId;
      };

      state.universeNodes = dedupedNodes.map((node) => {
        const parentIds = getParentUniverseIdsForNode(node)
          .map(remapId)
          .filter((id, index, list) => id && id !== node.id && list.indexOf(id) === index);
        const primaryParentId = remapId(node.parentUniverseId || '');
        const mergedParentIds = primaryParentId
          ? [primaryParentId, ...parentIds.filter((id) => id !== primaryParentId)]
          : parentIds;
        return {
          ...node,
          neighbors: (node.neighbors || [])
            .map(remapId)
            .filter((neighborId, index, list) => neighborId && neighborId !== node.id && list.indexOf(neighborId) === index),
          parentUniverseId: mergedParentIds[0] || '',
          parentUniverseIds: mergedParentIds
        };
      });

      const remappedMemberships = {};
      Object.entries(state.universeMemberships || {}).forEach(([childId, parentId]) => {
        const nextChildId = remapId(childId);
        const nextParentId = remapId(parentId);
        if (!nextChildId || !nextParentId || nextChildId === nextParentId) return;
        remappedMemberships[nextChildId] = nextParentId;
      });
      state.universeMemberships = remappedMemberships;
    }

    function sanitizeUniverseMembershipsAndPersist() {
      deduplicateUniverseNodesAndMemberships();
      const sanitizedMemberships = normalizeUniverseMemberships(state.universeMemberships);
      const changed = JSON.stringify(sanitizedMemberships) !== JSON.stringify(state.universeMemberships || {});
      state.universeMemberships = sanitizedMemberships;
      const validNodeIds = new Set(state.universeNodes.map((node) => String(node.id || '').trim()).filter(Boolean));
      state.universeNodes = state.universeNodes.map((node) => {
        const normalizedParents = getParentUniverseIdsForNode(node)
          .filter((parentId, index, list) => parentId !== node.id && validNodeIds.has(parentId) && list.indexOf(parentId) === index);
        const primaryParentId = String(state.universeMemberships[node.id] || '').trim();
        const mergedParents = primaryParentId
          ? [primaryParentId, ...normalizedParents.filter((parentId) => parentId !== primaryParentId)]
          : normalizedParents;
        return {
          ...node,
          kind: mergedParents.length ? 'world' : 'universe',
          parentUniverseId: primaryParentId || '',
          parentUniverseIds: mergedParents
        };
      });
      syncFavoriteUniverseSetFromNodes();
      if (changed) saveUniverseMemberships();
    }

    function saveVideos() {
      localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(VIDEOS));
      collectionModel = mergeModelWithLegacyVideos(collectionModel, VIDEOS);
      saveCollectionModel();
      buildAutoMarathonPlaylist();
      scheduleCloudSync();
      renderMapView();
    }

    function loadVideosFromStorage() {
      try {
        const raw = localStorage.getItem(VIDEOS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            VIDEOS.splice(0, VIDEOS.length, ...parsed.filter(video => video && typeof video === 'object'));
          }
        }
      } catch (_) {
        VIDEOS.splice(0, VIDEOS.length);
      }
      buildAutoMarathonPlaylist();
    }


    function normalizeAudioLibrary(rawAudioLibrary) {
      const base = { voces: [], fondos: [] };
      if (!rawAudioLibrary || typeof rawAudioLibrary !== 'object') return base;

      const normalizeCategory = (value) => {
        if (!Array.isArray(value)) return [];
        return value
          .filter(item => item && typeof item === 'object')
          .map((item) => ({
            id: String(item.id || `audio-${Date.now()}-${Math.random().toString(16).slice(2)}`),
            name: String(item.name || 'Archivo sin nombre'),
            path: String(item.path || ''),
            url: String(item.url || ''),
            contentType: String(item.contentType || 'audio/mpeg'),
            size: Number(item.size) || 0,
            createdAt: Number(item.createdAt) || Date.now()
          }));
      };

      return {
        voces: normalizeCategory(rawAudioLibrary.voces),
        fondos: normalizeCategory(rawAudioLibrary.fondos)
      };
    }

    function loadAudioLibraryFromStorage() {
      try {
        const raw = localStorage.getItem(AUDIO_LIBRARY_STORAGE_KEY);
        if (!raw) return normalizeAudioLibrary(null);
        return normalizeAudioLibrary(JSON.parse(raw));
      } catch (_) {
        return normalizeAudioLibrary(null);
      }
    }

    function saveAudioLibrary() {
      localStorage.setItem(AUDIO_LIBRARY_STORAGE_KEY, JSON.stringify(state.audioLibrary));
      scheduleCloudSync();
    }

    function setAudioUploadStatus(category, patch) {
      const current = state.uploadStatusByCategory?.[category] || { loading: false, error: '', success: '' };
      state.uploadStatusByCategory[category] = {
        loading: Boolean(typeof patch.loading === 'boolean' ? patch.loading : current.loading),
        error: patch.error !== undefined ? String(patch.error || '') : current.error,
        success: patch.success !== undefined ? String(patch.success || '') : current.success
      };
      if (state.view === 'config') renderConfigView();
    }

    function validateAudioFile(file) {
      const MAX_AUDIO_UPLOAD_BYTES = 15 * 1024 * 1024;
      if (!file) return 'No se recibió archivo.';
      if (!String(file.type || '').startsWith('audio/')) return 'Solo se permiten archivos de audio.';
      if (file.size > MAX_AUDIO_UPLOAD_BYTES) return 'El archivo supera el límite de 15 MB.';
      return '';
    }

    async function uploadAudioFileForCategory(file, category) {
      const error = validateAudioFile(file);
      if (error) throw new Error(error);
      if (!firebaseStorage) throw new Error('Storage no está inicializado.');

      const safeName = cssSafe(file.name.replace(/\.[^.]+$/, '') || 'audio');
      const extension = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'bin').toLowerCase();
      const folder = category === 'fondos' ? 'fondos' : 'voces';
      const uniqueId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `audioLibrary/${folder}/${uniqueId}-${safeName}.${extension}`;
      const ref = firebaseStorage.ref(path);
      const snapshot = await ref.put(file, {
        contentType: file.type,
        customMetadata: {
          category: folder,
          originalName: file.name
        }
      });
      const url = await snapshot.ref.getDownloadURL();

      return {
        id: uniqueId,
        name: file.name,
        path,
        url,
        contentType: file.type || 'audio/mpeg',
        size: Number(file.size) || 0,
        createdAt: Date.now()
      };
    }

    async function handleAudioLibraryFileSelected(event, category) {
      const file = event.target?.files?.[0];
      event.target.value = '';
      if (!file) return;

      setAudioUploadStatus(category, { loading: true, error: '', success: '' });
      try {
        const metadata = await uploadAudioFileForCategory(file, category);
        const current = Array.isArray(state.audioLibrary[category]) ? state.audioLibrary[category] : [];
        state.audioLibrary[category] = [metadata, ...current]
          .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        saveAudioLibrary();
        setAudioUploadStatus(category, {
          loading: false,
          success: `Archivo "${metadata.name}" subido correctamente.`,
          error: ''
        });
      } catch (err) {
        setAudioUploadStatus(category, {
          loading: false,
          error: err?.message || 'No se pudo subir el archivo.',
          success: ''
        });
      }
    }

    function hydrateModelWithFallback() {
      const storedModel = loadCollectionModelFromStorage();
      if (storedModel) {
        collectionModel = storedModel;
        return;
      }
      collectionModel = migrateLegacyVideosToModel(VIDEOS);
      saveCollectionModel();
    }

    function initFirebase() {
      if (!window.firebase) return false;
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
      firebaseDb = app.database();
      firebaseStorage = app.storage?.() || null;
      return true;
    }

    async function loadFromFirebase() {
      if (!firebaseDb) return;
      try {
        const snapshot = await firebaseDb.ref(CLOUD_STORAGE_PATH).get();
        const data = snapshot.val();
        if (!data || typeof data !== 'object') {
          buildAutoMarathonPlaylist();
          return;
        }

        const remoteUpdatedAt = Number(data.updatedAt) || 0;
        const localUniversesUpdatedAt = getLocalUniversesUpdatedAt();

        if (data.universeNodes && remoteUpdatedAt >= localUniversesUpdatedAt) {
          state.universeNodes = normalizeUniverseNodes(
            Object.entries(data.universeNodes).map(([id, val]) => ({ id, ...val }))
          );
          localStorage.setItem(UNIVERSES_STORAGE_KEY, JSON.stringify(state.universeNodes));
          localStorage.setItem(UNIVERSES_UPDATED_AT_KEY, String(remoteUpdatedAt || Date.now()));
          syncFavoriteUniverseSetFromNodes();
        }
        if (data.universeMemberships && typeof data.universeMemberships === 'object') {
          state.universeMemberships = normalizeUniverseMemberships(data.universeMemberships);
          localStorage.setItem(UNIVERSE_MEMBERSHIPS_STORAGE_KEY, JSON.stringify(state.universeMemberships));
        }
        if (Array.isArray(data.videos)) {
          VIDEOS.splice(0, VIDEOS.length, ...data.videos.filter(video => video && typeof video === 'object'));
          localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(VIDEOS));
        }
        if (data.collectionModel && typeof data.collectionModel === 'object') {
          const parsedModel = parseModelFromStorage(data.collectionModel);
          if (parsedModel) {
            collectionModel = parsedModel;
            localStorage.setItem(COLLECTION_MODEL_STORAGE_KEY, JSON.stringify(collectionModel));
          }
        }
        if (data.blockedCharactersByActor && typeof data.blockedCharactersByActor === 'object') {
          state.blockedCharactersByActor = data.blockedCharactersByActor;
          localStorage.setItem(BLOCKED_CHARACTERS_STORAGE_KEY, JSON.stringify(state.blockedCharactersByActor));
        }
        if (data.audioLibrary && typeof data.audioLibrary === 'object') {
          state.audioLibrary = normalizeAudioLibrary(data.audioLibrary);
          localStorage.setItem(AUDIO_LIBRARY_STORAGE_KEY, JSON.stringify(state.audioLibrary));
        }
        if (!collectionModel.videos.length && VIDEOS.length) {
          collectionModel = migrateLegacyVideosToModel(VIDEOS);
          localStorage.setItem(COLLECTION_MODEL_STORAGE_KEY, JSON.stringify(collectionModel));
        }
        buildAutoMarathonPlaylist();
      } catch (err) {
        console.warn('No se pudo leer Firebase, usando almacenamiento local.', err);
        buildAutoMarathonPlaylist();
      }
    }

    function buildAutoMarathonPlaylist() {
      const sortedPlayableVideos = [...VIDEOS]
        .filter((video) => Boolean(getYoutubeId(video?.url_youtube || '')))
        .sort((a, b) => String(a?.personaje || '').localeCompare(String(b?.personaje || ''), 'es', { sensitivity: 'base' }));
        
      AUTO_MARATHON_PLAYLIST = {
        id: 'auto-todos',
        name: 'Automática • Todos los personajes',
        source: 'auto',
        videoIds: sortedPlayableVideos.map((video) => video.id) // Chau Object.freeze, hola libertad
      };
      
      // Aseguramos que el estado de maratón exista antes de tocarlo
      if (!state.marathon.playlists) state.marathon.playlists = [];
      const customPlaylists = getCustomMarathonPlaylists();
      state.marathon.playlists = [AUTO_MARATHON_PLAYLIST, ...customPlaylists];
      
      // Unificamos el nombre a activePlaylistId (que es el que usa el reproductor)
      const playlistExists = state.marathon.playlists.some((playlist) => playlist.id === state.marathon.activePlaylistId);
      if (!playlistExists) {
        state.marathon.activePlaylistId = AUTO_MARATHON_PLAYLIST.id;
      }
      saveMarathonState();
      
      return AUTO_MARATHON_PLAYLIST;
    }

    function getMarathonQueue() {
      const selectedPlaylistId = state.marathon.selectedPlaylistId || AUTO_MARATHON_PLAYLIST.id;
      if (selectedPlaylistId === AUTO_MARATHON_PLAYLIST.id) {
        return AUTO_MARATHON_PLAYLIST.videoIds
          .map((videoId) => VIDEOS.find((video) => video.id === videoId))
          .filter(Boolean);
      }
      return getFilteredUniverseVideos();
    }

    async function flushCloudSync() {
      if (!firebaseDb) return;
      clearTimeout(cloudSyncTimer);
      const updatedAt = Date.now();
      try {
        await firebaseDb.ref(CLOUD_STORAGE_PATH).set({
          updatedAt,
          universeNodes: state.universeNodes,
          universeMemberships: state.universeMemberships,
          videos: VIDEOS,
          collectionModel,
          blockedCharactersByActor: state.blockedCharactersByActor,
          audioLibrary: state.audioLibrary
        });
      } catch (err) {
        console.warn('No se pudo guardar en Firebase.', err);
      }
    }

    function scheduleCloudSync() {
      if (!firebaseDb) return;
      clearTimeout(cloudSyncTimer);
      cloudSyncTimer = setTimeout(() => {
        flushCloudSync();
      }, 450);
    }

    function getVideoUniverses(video) {
      if (Array.isArray(video.universo)) return video.universo;
      return video.universo ? [video.universo] : [];
    }

    function getUniverseVideos() {
      const target = normalizeUniverseName(state.universe || '');
      return VIDEOS.filter(v => getVideoUniverses(v).some(name => normalizeUniverseName(name) === target));
    }

    function getUniverseCoverByName(universeName) {
      const normalizedUniverse = normalizeUniverseName(universeName || '');
      if (!normalizedUniverse) return '';
      const nodeCover = state.universeNodes
        .find(node => normalizeUniverseName(node.name) === normalizedUniverse)?.cover || '';
      if (nodeCover) return nodeCover;
      const universeData = groupByUniverse()[normalizedUniverse];
      return getUniverseCover(universeData?.videos || []);
    }


    function getUniverseAvatarFallbackEmoji(universeName) {
      const normalized = normalizeUniverseName(universeName || '');
      if (!normalized || normalized === normalizeUniverseName('Sin universo') || normalized === normalizeUniverseName('Sin universos') || normalized === normalizeUniverseName('Ninguno')) {
        return '🌌';
      }
      return '🪐';
    }

    function getFilteredUniverseVideos() {
      return getUniverseVideos().filter(v => {
        const m1 = state.filters.personaje === 'todos' || (v.personaje || 'Sin personaje') === state.filters.personaje;
        const m2 = state.filters.actor === 'todos' || (v.actor_de_doblaje || 'Sin actor') === state.filters.actor;
        const m3 = state.filters.rareza === 'todos' || (v.rareza || 'Común') === state.filters.rareza;
        return m1 && m2 && m3;
      });
    }

    function getCharactersIndex(videos) {
      const grouped = videos.reduce((acc, v) => {
        acc[v.personaje] = acc[v.personaje] || [];
        acc[v.personaje].push(v);
        return acc;
      }, {});
      return Object.entries(grouped).map(([personaje, versions]) => ({ personaje, versions }));
    }

    function hashCode(text) {
      return [...text].reduce((acc, ch) => ((acc * 31) + ch.charCodeAt(0)) >>> 0, 7);
    }

    function getUniverseCover(videos) {
      const first = videos?.[0];
      if (!first) return '';
      const embed = toEmbedUrl(first.url_youtube || first.url_video || '');
      const videoId = embed.split('/embed/')[1]?.split('?')[0];
      return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
    }

    function getYoutubeId(url) {
      const normalizeId = (candidate) => {
        const clean = String(candidate || '').trim();
        return /^[A-Za-z0-9_-]{11}$/.test(clean) ? clean : '';
      };
      const raw = String(url || '').trim();
      if (!raw) return '';
      try {
        const parsed = new URL(raw);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') {
          return normalizeId(parsed.pathname.split('/').filter(Boolean)[0]);
        }
        if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
          const watchId = parsed.searchParams.get('v');
          if (watchId) return normalizeId(watchId);
          const pathParts = parsed.pathname.split('/').filter(Boolean);
          if (pathParts[0] === 'shorts' && pathParts[1]) return normalizeId(pathParts[1]);
          if (pathParts[0] === 'embed' && pathParts[1]) return normalizeId(pathParts[1]);
        }
      } catch (_) {
        // Fallback para entradas no parseables como URL.
      }
      const match = raw.match(/(?:v=|\/shorts\/|\/embed\/|\.be\/)([A-Za-z0-9_-]{11})/);
      return normalizeId(match?.[1]);
    }

    function normalizeYoutubeUrl(url) {
      const id = getYoutubeId(url);
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    async function fetchYoutubeMetadata(url) {
      const normalized = normalizeYoutubeUrl(url);
      const id = getYoutubeId(normalized);
      if (!id) return { title: 'Video sin título', thumbnail: '' };
      const fallbackThumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      try {
        const oembedUrl = `https://www.youtube.com/watch?v=${id}`;
        const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(oembedUrl)}&format=json`;
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('No disponible');
        const data = await response.json();
        return {
          title: data.title || 'Video sin título',
          thumbnail: data.thumbnail_url || fallbackThumb
        };
      } catch (_) {
        return { title: 'Video sin título', thumbnail: fallbackThumb };
      }
    }

    function createNodeShape(seed) {
      const pick = (min, max, shift) => min + ((seed >> shift) % (max - min + 1));
      return `${pick(42, 58, 2)}% ${pick(35, 62, 5)}% ${pick(44, 60, 8)}% ${pick(36, 62, 11)}% / ${pick(42, 64, 14)}% ${pick(36, 60, 17)}% ${pick(38, 62, 20)}% ${pick(36, 62, 23)}%`;
    }

    function findPlacementForNode(existingNodes, canvas, seed) {
      const minDistance = 235;
      const margin = 140;
      const candidateAngles = 12;
      const radii = [220, 310, 400, 490];
      const sortedAnchors = [...existingNodes].sort((a, b) => a.neighbors.length - b.neighbors.length);

      const isValidPoint = (x, y) => {
        if (x < margin || y < margin || x > canvas.width - margin || y > canvas.height - margin) return false;
        return existingNodes.every(node => Math.hypot(node.x - x, node.y - y) >= minDistance);
      };

      for (const anchor of sortedAnchors) {
        for (const radius of radii) {
          for (let i = 0; i < candidateAngles; i += 1) {
            const baseAngle = (Math.PI * 2 * i) / candidateAngles;
            const jitter = (((seed + i * 13 + radius) % 27) - 13) * (Math.PI / 180);
            const angle = baseAngle + jitter;
            const x = Math.round(anchor.x + Math.cos(angle) * radius);
            const y = Math.round(anchor.y + Math.sin(angle) * radius);
            if (isValidPoint(x, y)) {
              return { x, y, anchorId: anchor.id };
            }
          }
        }
      }
      return null;
    }

    function getUniverseBounds() {
      if (!state.universeNodes.length) return null;
      const bounds = state.universeNodes.reduce((acc, node) => {
        let minX = node.x - NODE_HALF_WIDTH;
        let maxX = node.x + NODE_HALF_WIDTH;
        let minY = node.y - NODE_HALF_HEIGHT;
        let maxY = node.y + NODE_HALF_HEIGHT;
        if (state.expandedUniverses.has(node.id)) {
          const worldCount = getUniverseWorldEntries(node.name).length;
          const orbitRadius = getWorldOrbitRadius(worldCount);
          if (orbitRadius > 0) {
            minX = Math.min(minX, node.x - orbitRadius - WORLD_NODE_HALF_WIDTH);
            maxX = Math.max(maxX, node.x + orbitRadius + WORLD_NODE_HALF_WIDTH);
            minY = Math.min(minY, node.y - orbitRadius - WORLD_NODE_HALF_HEIGHT);
            maxY = Math.max(maxY, node.y + orbitRadius + WORLD_NODE_HALF_HEIGHT);
          }
        }
        acc.minX = Math.min(acc.minX, minX);
        acc.maxX = Math.max(acc.maxX, maxX);
        acc.minY = Math.min(acc.minY, minY);
        acc.maxY = Math.max(acc.maxY, maxY);
        return acc;
      }, { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY });
      const { minX, maxX, minY, maxY } = bounds;
      return { minX, maxX, minY, maxY };
    }

    function getWorldOrbitRadius(worldCount) {
      if (!Number.isFinite(worldCount) || worldCount <= 0) return 0;
      const minimumRadiusForSpacing = worldCount > 1
        ? Math.ceil(WORLD_ORBIT_MIN_CENTER_DISTANCE / (2 * Math.sin(Math.PI / worldCount)))
        : WORLD_ORBIT_BASE_RADIUS;
      return Math.max(WORLD_ORBIT_BASE_RADIUS, minimumRadiusForSpacing);
    }

    function getUniverseCentroid() {
      if (!state.universeNodes.length) {
        return { x: state.mapCanvas.width / 2, y: state.mapCanvas.height / 2 };
      }
      const sum = state.universeNodes.reduce((acc, node) => {
        acc.x += node.x;
        acc.y += node.y;
        return acc;
      }, { x: 0, y: 0 });
      return {
        x: sum.x / state.universeNodes.length,
        y: sum.y / state.universeNodes.length
      };
    }

    function recalculateMapCanvasSize(viewportWidth = 0, viewportHeight = 0) {
      const padding = 180;
      const minWidth = Math.max(1200, viewportWidth + 180);
      const minHeight = Math.max(760, viewportHeight + 180);
      if (!state.universeNodes.length) {
        state.mapCanvas.width = minWidth;
        state.mapCanvas.height = minHeight;
        return;
      }
      const xs = state.universeNodes.map(node => node.x);
      const ys = state.universeNodes.map(node => node.y);
      const maxX = Math.max(...xs) + NODE_HALF_WIDTH + padding;
      const maxY = Math.max(...ys) + NODE_HALF_HEIGHT + padding;
      state.mapCanvas.width = Math.max(minWidth, maxX);
      state.mapCanvas.height = Math.max(minHeight, maxY);
    }

    function ensureUniverseNodes() {
      const universeMap = groupByUniverse();
      const specialUniverseKey = normalizeUniverseName(SPECIAL_UNASSIGNED_UNIVERSE);
      const specialUniverseData = universeMap[specialUniverseKey];
      if (!specialUniverseData || specialUniverseData.totalCharacters === 0) {
        state.universeNodes = state.universeNodes.filter(
          node => normalizeUniverseName(node.name) !== specialUniverseKey
        );
      }

      const activeUniverseNames = Object.values(universeMap).map(universe => universe.name);
      const validManualNames = state.universeNodes
        .map(node => node.name)
        .filter((name) => {
          const normalized = normalizeUniverseName(name);
          if (!normalized) return false;
          if (normalized === specialUniverseKey) return Boolean(specialUniverseData?.totalCharacters);
          return true;
        });
      const names = Array.from(new Set([...activeUniverseNames, ...validManualNames]));
      if (!names.length) return;

      const existingByName = new Map(state.universeNodes.map(node => [normalizeUniverseName(node.name), node]));

      if (!state.universeNodes.length && names.length) {
        const firstName = names[0];
        const firstSeed = hashCode(firstName);
        state.universeNodes.push({
          id: cssSafe(firstName),
          name: firstName,
          cover: getSafeUniverseCover(firstName, getUniverseCover(universeMap[normalizeUniverseName(firstName)]?.videos || [])),
          x: Math.round(state.mapCanvas.width / 2),
          y: Math.round(state.mapCanvas.height / 2),
          neighbors: [],
          shape: createNodeShape(firstSeed),
          kind: 'universe',
          parentUniverseId: '',
          parentUniverseIds: []
        });
      }

      names.forEach((name) => {
        const normalized = normalizeUniverseName(name);
        if (existingByName.has(normalized) || state.universeNodes.some(node => normalizeUniverseName(node.name) === normalized)) return;
        const seed = hashCode(name);
        let placement = findPlacementForNode(state.universeNodes, state.mapCanvas, seed);
        let safety = 0;
        while (!placement && safety < 5) {
          state.mapCanvas.width += 360;
          state.mapCanvas.height += 240;
          placement = findPlacementForNode(state.universeNodes, state.mapCanvas, seed + safety);
          safety += 1;
        }
        const fallbackX = state.mapCanvas.width - 180 - (seed % 120);
        const fallbackY = state.mapCanvas.height - 180 - ((seed >> 3) % 120);
        const point = placement || {
          x: Math.max(160, fallbackX),
          y: Math.max(160, fallbackY),
          anchorId: state.universeNodes[0]?.id
        };

        state.universeNodes.push({
          id: cssSafe(name),
          name,
          cover: getSafeUniverseCover(name, getUniverseCover(universeMap[normalizeUniverseName(name)]?.videos || [])),
          x: point.x,
          y: point.y,
          neighbors: point.anchorId ? [point.anchorId] : [],
          shape: createNodeShape(seed),
          kind: 'universe',
          parentUniverseId: '',
          parentUniverseIds: []
        });

        if (point.anchorId) {
          const anchor = state.universeNodes.find(node => node.id === point.anchorId);
          if (anchor && !anchor.neighbors.includes(cssSafe(name))) {
            anchor.neighbors.push(cssSafe(name));
          }
        }
      });
      state.universeNodes.forEach(node => {
        if (node.kind !== 'world' && node.kind !== 'universe') node.kind = 'universe';
        if (typeof node.parentUniverseId !== 'string') node.parentUniverseId = '';
        if (!Array.isArray(node.parentUniverseIds)) node.parentUniverseIds = [];
        const universeData = universeMap[normalizeUniverseName(node.name)];
        if (!node.cover && universeData) {
          node.cover = getSafeUniverseCover(node.name, getUniverseCover(universeData.videos || []));
        } else if (!node.cover) {
          node.cover = getSafeUniverseCover(node.name, '');
        }
      });
      sanitizeUniverseMembershipsAndPersist();
      saveUniverseNodes();
    }

    function getUniverseChildWorldEntries(universeName) {
      const parentNode = state.universeNodes.find((node) => normalizeUniverseName(node.name) === normalizeUniverseName(universeName));
      if (!parentNode) return [];
      const byChildName = new Map();
      const universeMap = groupByUniverse();
      Object.entries(state.universeMemberships || {}).forEach(([childId, parentId]) => {
        if (parentId !== parentNode.id) return;
        const childNode = state.universeNodes.find((node) => node.id === childId);
        if (!childNode?.name) return;
        const childName = String(childNode.name).trim();
        if (!childName) return;
        const childKey = normalizeUniverseName(childName);
        const childUniverseData = universeMap[childKey] || { totalCharacters: 0, unlockedCharacters: 0, completion: 0, state: 'incomplete' };
        if (!byChildName.has(childKey)) {
          byChildName.set(childKey, {
            id: childNode.id,
            name: childName,
            cover: childNode.cover || '',
            unlocked: true,
            stats: childUniverseData
          });
        }
      });
      return [...byChildName.values()].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }

    function getUniverseWorldEntries(universeName) {
      const entries = getUniverseChildWorldEntries(universeName);
      const parentNode = state.universeNodes.find((node) => normalizeUniverseName(node.name) === normalizeUniverseName(universeName));
      if (!parentNode) return entries;

      const parentUniverseData = groupByUniverse()[normalizeUniverseName(parentNode.name)];
      const hasOwnCharacters = (parentUniverseData?.totalCharacters || 0) > 0;
      if (!hasOwnCharacters) return entries;

      const parentKey = normalizeUniverseName(parentNode.name);
      const alreadyIncluded = entries.some((entry) => normalizeUniverseName(entry.name) === parentKey);
      if (!alreadyIncluded) {
        entries.push({
          id: parentNode.id,
          name: parentNode.name,
          cover: parentNode.cover || '',
          unlocked: true,
          stats: parentUniverseData
        });
      }

      return entries.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }

    function getConnectorVariant(seedKey) {
      const hash = Math.abs(hashCode(String(seedKey || 'connector')));
      const curveStrength = 0.16 + ((hash % 35) / 100);
      const arcBias = 0.24 + (((hash >> 3) % 30) / 100);
      const twistDirection = (hash & 1) ? 1 : -1;
      const sway = 6 + ((hash >> 6) % 18);
      const width = (2.6 + (((hash >> 4) % 14) / 10)).toFixed(2);
      return {
        curveStrength: Number(curveStrength.toFixed(3)),
        arcBias: Number(arcBias.toFixed(3)),
        twistDirection,
        sway,
        width
      };
    }

    function buildConnectorPath(startX, startY, endX, endY, angle, options = {}) {
      const dx = endX - startX;
      const dy = endY - startY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const tangentX = dx / distance;
      const tangentY = dy / distance;
      const normalX = -tangentY;
      const normalY = tangentX;
      const curveStrength = Number.isFinite(options.curveStrength) ? options.curveStrength : 0.22;
      const arcBias = Number.isFinite(options.arcBias) ? options.arcBias : 0.3;
      const twistDirection = options.twistDirection === -1 ? -1 : 1;
      const sway = Number.isFinite(options.sway) ? options.sway : 0;
      const bendPrimary = Math.max(24, Math.min(160, distance * curveStrength));
      const bendSecondary = Math.max(16, Math.min(120, bendPrimary * (0.68 + (arcBias * 0.45))));
      const angleSway = Math.sin((angle || 0) * 2.2) * sway;
      const control1X = startX + (dx * (0.24 + (arcBias * 0.14))) + (normalX * ((bendPrimary + angleSway) * twistDirection));
      const control1Y = startY + (dy * (0.24 + (arcBias * 0.14))) + (normalY * ((bendPrimary + angleSway) * twistDirection));
      const control2X = startX + (dx * (0.74 - (arcBias * 0.12))) - (normalX * ((bendSecondary - angleSway) * twistDirection));
      const control2Y = startY + (dy * (0.74 - (arcBias * 0.12))) - (normalY * ((bendSecondary - angleSway) * twistDirection));
      return `M ${Math.round(startX)} ${Math.round(startY)} C ${Math.round(control1X)} ${Math.round(control1Y)} ${Math.round(control2X)} ${Math.round(control2Y)} ${Math.round(endX)} ${Math.round(endY)}`;
    }

    const mapViewRuntime = {
      handlersBound: false,
      dragState: {
        activeNodeId: '',
        targetNodeId: '',
        pointerId: null,
        offsetX: 0,
        offsetY: 0,
        startClientX: 0,
        startClientY: 0,
        moved: false,
        activeNodeElement: null
      },
      toolDragState: {
        active: false,
        tool: '',
        pointerId: null,
        tokenEl: null,
        targetNodeId: '',
        targetType: '',
        targetParentId: ''
      }
    };

    function renderMapView(options = {}) {
      const {
        rebuildWorld = true
      } = options;

      const ensureMapStructure = () => {
        if (viewMap.querySelector('#universeMapCanvas')) return;
        viewMap.innerHTML = `
          <div class="universe-map-shell">
            <div class="map-toolbar">
              <button type="button" id="mapToolBigBang" class="neon-btn map-tool-btn map-tool-btn--bigbang" data-map-tool="bigbang" aria-label="Herramienta Big Bang (arrastra al nodo)">💥</button>
              <button type="button" id="mapToolBlackhole" class="neon-btn map-tool-btn map-tool-btn--blackhole" data-map-tool="blackhole" aria-label="Herramienta Agujero negro (arrastra al nodo)">🕳️</button>
              <button type="button" id="mapToolInteruniversal" class="neon-btn map-tool-btn map-tool-btn--interuniversal ${state.showInteruniversalConnections ? 'is-active' : ''}" aria-label="Mostrar/ocultar conexiones interuniversales" aria-pressed="${state.showInteruniversalConnections ? 'true' : 'false'}">🌠</button>
            </div>
            <div id="universeMapCanvas" aria-label="Mapa de universos explorable">
              <div class="map-nebula-layer" aria-hidden="true"></div>
              <div class="map-stars-layer" aria-hidden="true"></div>
              <div class="map-world" id="mapWorld"></div>
            </div>
          </div>
        `;
      };

      ensureMapStructure();

      const mapCanvas = document.getElementById('universeMapCanvas');
      const mapWorld = document.getElementById('mapWorld');
      if (!mapCanvas || !mapWorld) return;
      const mapShell = viewMap.querySelector('.universe-map-shell');
      if (!mapShell) return;

      const MIN_MAP_ZOOM = 0.25;
      const MAX_MAP_ZOOM = 2.0;
      const WHEEL_ZOOM_FACTOR = 1.1;
      const DRAG_OPEN_THRESHOLD = 8;
      const DROP_TARGET_EDGE_SNAP_DISTANCE = 44;
      const DROP_TARGET_CENTER_SNAP_DISTANCE = 86;

      const syncMapZoomDisplay = (scaleValue) => {
        const percentage = `${Math.round(scaleValue * 100)}%`;
        const zoomPercentEl = viewMap.querySelector('[data-map-zoom-percent], #mapZoomPercent');
        if (zoomPercentEl) zoomPercentEl.textContent = percentage;
        const zoomRangeEl = viewMap.querySelector('[data-map-zoom-range], #mapZoomRange');
        if (zoomRangeEl instanceof HTMLInputElement) {
          zoomRangeEl.min = String(MIN_MAP_ZOOM);
          zoomRangeEl.max = String(MAX_MAP_ZOOM);
          zoomRangeEl.step = zoomRangeEl.step || '0.01';
          zoomRangeEl.value = String(scaleValue);
        }
      };

      const applyMapScale = (nextScale, focalPoint) => {
        const safeScale = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, Number((nextScale || 1).toFixed(3))));
        state.mapViewport.scale = safeScale;
        mapWorld.style.transformOrigin = '0 0';
        mapWorld.style.transform = `scale(${safeScale})`;
        syncMapZoomDisplay(safeScale);
        if (focalPoint && Number.isFinite(focalPoint.x) && Number.isFinite(focalPoint.y)) {
          state.mapViewport.centroidX = focalPoint.x;
          state.mapViewport.centroidY = focalPoint.y;
          const pointerX = Number.isFinite(focalPoint.pointerX) ? focalPoint.pointerX : mapShell.clientWidth / 2;
          const pointerY = Number.isFinite(focalPoint.pointerY) ? focalPoint.pointerY : mapShell.clientHeight / 2;
          const targetX = (focalPoint.x * safeScale) - pointerX;
          const targetY = (focalPoint.y * safeScale) - pointerY;
          mapShell.scrollLeft = Math.max(0, targetX);
          mapShell.scrollTop = Math.max(0, targetY);
          return;
        }
        const targetX = (state.mapViewport.centroidX * safeScale) - (mapShell.clientWidth / 2);
        const targetY = (state.mapViewport.centroidY * safeScale) - (mapShell.clientHeight / 2);
        mapShell.scrollLeft = Math.max(0, targetX);
        mapShell.scrollTop = Math.max(0, targetY);
      };

      const syncMapCanvasSize = () => {
        recalculateMapCanvasSize(mapShell.clientWidth, mapShell.clientHeight);
        mapCanvas.style.width = `${state.mapCanvas.width}px`;
        mapCanvas.style.height = `${state.mapCanvas.height}px`;
        mapWorld.style.width = `${state.mapCanvas.width}px`;
        mapWorld.style.height = `${state.mapCanvas.height}px`;
        const bounds = getUniverseBounds();
        if (!bounds) {
          applyMapScale(1, {
            x: state.mapCanvas.width / 2,
            y: state.mapCanvas.height / 2
          });
          return;
        }
        const padding = 48;
        const availableWidth = Math.max(220, mapShell.clientWidth - (padding * 2));
        const availableHeight = Math.max(220, mapShell.clientHeight - (padding * 2));
        const spanWidth = Math.max(1, bounds.maxX - bounds.minX);
        const spanHeight = Math.max(1, bounds.maxY - bounds.minY);
        const scale = Math.min(1, availableWidth / spanWidth, availableHeight / spanHeight);
        const centroid = getUniverseCentroid();
        applyMapScale(scale, centroid);
      };

      const toWorldPoint = (event) => {
        const rect = mapCanvas.getBoundingClientRect();
        const scale = state.mapViewport.scale || 1;
        return {
          x: (event.clientX - rect.left + mapShell.scrollLeft) / scale,
          y: (event.clientY - rect.top + mapShell.scrollTop) / scale
        };
      };

      const resetDragState = () => {
        mapViewRuntime.dragState.activeNodeId = '';
        mapViewRuntime.dragState.targetNodeId = '';
        mapViewRuntime.dragState.pointerId = null;
        mapViewRuntime.dragState.offsetX = 0;
        mapViewRuntime.dragState.offsetY = 0;
        mapViewRuntime.dragState.startClientX = 0;
        mapViewRuntime.dragState.startClientY = 0;
        mapViewRuntime.dragState.moved = false;
        mapViewRuntime.dragState.activeNodeElement = null;
      };

      const resetToolDragState = ({ removeToken = true } = {}) => {
        mapViewRuntime.toolDragState.active = false;
        mapViewRuntime.toolDragState.tool = '';
        mapViewRuntime.toolDragState.pointerId = null;
        mapViewRuntime.toolDragState.targetNodeId = '';
        mapViewRuntime.toolDragState.targetType = '';
        mapViewRuntime.toolDragState.targetParentId = '';
        if (removeToken && mapViewRuntime.toolDragState.tokenEl) {
          mapViewRuntime.toolDragState.tokenEl.remove();
        }
        mapViewRuntime.toolDragState.tokenEl = null;
        viewMap.classList.remove('map-tool-active');
      };

      const updateDragTargetHighlight = (activeNodeId = '', targetNodeId = '') => {
        viewMap.querySelectorAll('.universe-node').forEach((nodeEl) => {
          const nodeId = nodeEl.dataset.nodeId || '';
          nodeEl.classList.toggle('is-dragging', Boolean(activeNodeId) && nodeId === activeNodeId);
          nodeEl.classList.toggle('is-drop-target', Boolean(targetNodeId) && nodeId === targetNodeId);
        });
      };

      const updateToolDropTargetHighlight = (tool = '', targetNodeId = '', targetType = '', targetParentId = '') => {
        viewMap.querySelectorAll('.universe-node').forEach((nodeEl) => {
          const nodeId = nodeEl.dataset.nodeId || nodeEl.dataset.worldId || '';
          const isWorld = nodeEl.classList.contains('universe-node--world');
          const isTarget = targetNodeId && nodeId === targetNodeId
            && ((!isWorld && targetType === 'universe') || (isWorld && targetType === 'world'))
            && (!isWorld || (nodeEl.dataset.parentId || '') === (targetParentId || ''));
          nodeEl.classList.toggle('is-tool-target', Boolean(isTarget));
          nodeEl.classList.toggle('is-tool-target--danger', Boolean(isTarget) && tool === 'blackhole');
        });
      };

      const getToolDropTargetFromPoint = (clientX, clientY) => {
        const hovered = document.elementFromPoint(clientX, clientY);
        if (!hovered) return null;
        const worldEl = hovered.closest('.universe-node--world[data-world-id]');
        if (worldEl) {
          return {
            type: 'world',
            nodeId: worldEl.dataset.worldId || '',
            parentId: worldEl.dataset.parentId || ''
          };
        }
        const universeEl = hovered.closest('.universe-node--universe[data-node-id]');
        if (universeEl) {
          return {
            type: 'universe',
            nodeId: universeEl.dataset.nodeId || '',
            parentId: ''
          };
        }
        return null;
      };

      const releaseWorldFromParent = (worldId, parentId) => {
        const worldNode = state.universeNodes.find((node) => node.id === worldId);
        if (!worldNode) return false;
        const parentIds = getParentUniverseIdsForNode(worldNode);
        if (!parentIds.includes(parentId)) return false;
        const remainingParentIds = parentIds.filter((id) => id !== parentId);
        const nextPrimaryParentId = remainingParentIds[0] || '';
        if (nextPrimaryParentId) state.universeMemberships[worldId] = nextPrimaryParentId;
        else delete state.universeMemberships[worldId];
        worldNode.parentUniverseId = nextPrimaryParentId;
        worldNode.parentUniverseIds = remainingParentIds;
        worldNode.kind = remainingParentIds.length ? 'world' : 'universe';
        return true;
      };

      const releaseAllWorldsFromUniverse = (parentUniverseId) => {
        let changed = false;
        state.universeNodes.forEach((node) => {
          if (!node || node.id === parentUniverseId) return;
          const parentIds = getParentUniverseIdsForNode(node);
          if (!parentIds.includes(parentUniverseId)) return;
          const remainingParentIds = parentIds.filter((id) => id !== parentUniverseId);
          const nextPrimaryParentId = remainingParentIds[0] || '';
          if (nextPrimaryParentId) state.universeMemberships[node.id] = nextPrimaryParentId;
          else delete state.universeMemberships[node.id];
          node.parentUniverseId = nextPrimaryParentId;
          node.parentUniverseIds = remainingParentIds;
          node.kind = remainingParentIds.length ? 'world' : 'universe';
          changed = true;
        });
        return changed;
      };

      const deleteUniverseNode = (nodeId) => {
        const nodeToDelete = state.universeNodes.find((node) => node.id === nodeId);
        if (!nodeToDelete) return false;
        delete state.universeMemberships[nodeId];
        state.universeNodes = state.universeNodes.filter((node) => node.id !== nodeId);
        Object.entries({ ...(state.universeMemberships || {}) }).forEach(([childId, parentId]) => {
          if (parentId !== nodeId) return;
          const childNode = state.universeNodes.find((node) => node.id === childId);
          if (!childNode) {
            delete state.universeMemberships[childId];
            return;
          }
          const remainingParentIds = getParentUniverseIdsForNode(childNode).filter((id) => id !== nodeId);
          const nextPrimaryParentId = remainingParentIds[0] || '';
          if (nextPrimaryParentId) state.universeMemberships[childId] = nextPrimaryParentId;
          else delete state.universeMemberships[childId];
          childNode.parentUniverseId = nextPrimaryParentId;
          childNode.parentUniverseIds = remainingParentIds;
          childNode.kind = remainingParentIds.length ? 'world' : 'universe';
        });
        state.universeNodes.forEach((node) => {
          if (!node || node.id === nodeId) return;
          const nextParentIds = getParentUniverseIdsForNode(node).filter((id) => id !== nodeId);
          const nextPrimaryParentId = nextParentIds[0] || '';
          if (nextPrimaryParentId) state.universeMemberships[node.id] = nextPrimaryParentId;
          else delete state.universeMemberships[node.id];
          node.parentUniverseId = nextPrimaryParentId;
          node.parentUniverseIds = nextParentIds;
          node.kind = nextParentIds.length ? 'world' : 'universe';
        });
        state.expandedUniverses.delete(nodeId);
        if (state.universe && normalizeUniverseName(state.universe) === normalizeUniverseName(nodeToDelete.name)) {
          state.universe = null;
          state.selectedVideoId = null;
          if (state.view === 'universe') changeView('map');
        }
        return true;
      };

      const applyMapToolDrop = (tool, target) => {
        if (!tool || !target?.nodeId) return false;
        if (tool === 'bigbang') {
          if (target.type === 'world') {
            return releaseWorldFromParent(target.nodeId, target.parentId);
          }
          if (target.type === 'universe') {
            return releaseAllWorldsFromUniverse(target.nodeId);
          }
          return false;
        }
        if (tool === 'blackhole') {
          return deleteUniverseNode(target.nodeId);
        }
        return false;
      };

      const updateConnectorPath = (pathEl, startX, startY, endX, endY, angle) => {
        if (!pathEl) return;
        const curveStrength = Number.parseFloat(pathEl.dataset.curveStrength || '');
        const arcBias = Number.parseFloat(pathEl.dataset.arcBias || '');
        const twistDirection = Number.parseInt(pathEl.dataset.twistDirection || '1', 10);
        const sway = Number.parseFloat(pathEl.dataset.sway || '');
        const path = buildConnectorPath(startX, startY, endX, endY, angle, {
          curveStrength: Number.isFinite(curveStrength) ? curveStrength : 0.22,
          arcBias: Number.isFinite(arcBias) ? arcBias : 0.3,
          twistDirection: twistDirection === -1 ? -1 : 1,
          sway: Number.isFinite(sway) ? sway : 0
        });
        pathEl.setAttribute('d', path);
      };

      const updateVisibleWorldConnectors = () => {
        const worldEls = [...viewMap.querySelectorAll('.universe-node--world[data-parent-id]')];
        worldEls.forEach((worldEl) => {
          const parentNodeId = worldEl.dataset.parentId || '';
          if (!parentNodeId || !state.expandedUniverses.has(parentNodeId)) return;
          const parentNode = state.universeNodes.find((item) => item.id === parentNodeId);
          if (!parentNode) return;
          const baseAngle = Number.parseFloat(worldEl.dataset.baseAngle || '0');
          const baseDx = Number.parseFloat(worldEl.dataset.baseDx || '');
          const baseDy = Number.parseFloat(worldEl.dataset.baseDy || '');
          if (!Number.isFinite(baseAngle)) return;
          const fallbackWorldRectX = Number.parseFloat(worldEl.style.left || '0');
          const fallbackWorldRectY = Number.parseFloat(worldEl.style.top || '0');
          const dx = Number.isFinite(baseDx) ? baseDx : (fallbackWorldRectX + WORLD_NODE_HALF_WIDTH - parentNode.x);
          const dy = Number.isFinite(baseDy) ? baseDy : (fallbackWorldRectY + WORLD_NODE_HALF_HEIGHT - parentNode.y);
          const targetCenterX = parentNode.x + dx;
          const targetCenterY = parentNode.y + dy;
          worldEl.dataset.baseDx = `${Math.round(dx)}`;
          worldEl.dataset.baseDy = `${Math.round(dy)}`;
          worldEl.style.left = `${Math.round(targetCenterX - WORLD_NODE_HALF_WIDTH)}px`;
          worldEl.style.top = `${Math.round(targetCenterY - WORLD_NODE_HALF_HEIGHT)}px`;
          const worldKey = worldEl.dataset.worldKey || '';
          const pathEl = viewMap.querySelector(`.map-link-path[data-parent-id="${parentNodeId}"][data-world-key="${worldKey}"]`);
          updateConnectorPath(pathEl, parentNode.x, parentNode.y, targetCenterX, targetCenterY, baseAngle);
          const secondaryPathEls = [
            ...viewMap.querySelectorAll(`.map-link-path--secondary[data-source-world-key="${worldKey}"]`)
          ];
          secondaryPathEls.forEach((secondaryPathEl) => {
            const secondaryParentId = secondaryPathEl.dataset.secondaryParentId || '';
            if (!secondaryParentId) return;
            const secondaryParent = state.universeNodes.find((item) => item.id === secondaryParentId);
            if (!secondaryParent) return;
            const bridgeAngle = Math.atan2(secondaryParent.y - targetCenterY, secondaryParent.x - targetCenterX);
            updateConnectorPath(secondaryPathEl, targetCenterX, targetCenterY, secondaryParent.x, secondaryParent.y, bridgeAngle);
          });
        });
      };

      const findDropTargetForNode = (activeNode) => {
        if (!activeNode) return null;
        let best = null;
        state.universeNodes.forEach((candidateNode) => {
          if (!candidateNode || candidateNode.id === activeNode.id) return;
          if (getUniverseParentId(candidateNode.id)) return;
          const dx = candidateNode.x - activeNode.x;
          const dy = candidateNode.y - activeNode.y;
          const centerDistance = Math.hypot(dx, dy);
          if (centerDistance > DROP_TARGET_CENTER_SNAP_DISTANCE) return;
          const edgeGapX = Math.max(0, Math.abs(dx) - (NODE_HALF_WIDTH * 2));
          const edgeGapY = Math.max(0, Math.abs(dy) - (NODE_HALF_HEIGHT * 2));
          const edgeDistance = Math.hypot(edgeGapX, edgeGapY);
          if (edgeDistance > DROP_TARGET_EDGE_SNAP_DISTANCE) return;
          const score = (edgeDistance * 1000) + centerDistance;
          if (!best || score < best.score) {
            best = { node: candidateNode, score };
          }
        });
        return best?.node || null;
      };

      const renderMapWorldContent = () => {
        const universes = groupByUniverse();
        ensureUniverseNodes();
        syncFavoriteUniverseSetFromNodes();
        const worldNodes = [];
        const worldLinks = [];
        const childUniverseIds = new Set(Object.keys(state.universeMemberships || {}));
        const rootUniverseNodes = state.universeNodes.filter((node) => !childUniverseIds.has(node.id) || node.isFavorite === true);
        const rootUniverseNodeIds = new Set(rootUniverseNodes.map((node) => node.id));
        const absorptionEffect = state.mapAbsorptionEffect;
        const absorptionMarkup = absorptionEffect
          ? `
              <div
                class="absorption-effect"
                style="--start-x:${Math.round(absorptionEffect.startX)}px; --start-y:${Math.round(absorptionEffect.startY)}px; --delta-x:${Math.round(absorptionEffect.deltaX)}px; --delta-y:${Math.round(absorptionEffect.deltaY)}px; --path-length:${Math.round(absorptionEffect.pathLength)}px; --angle:${absorptionEffect.angleDeg.toFixed(2)}deg;"
                aria-hidden="true"
              ></div>
            `
          : '';
        const nodesMarkup = rootUniverseNodes.map(node => {
          const universeData = universes[normalizeUniverseName(node.name)] || { totalCharacters: 0, unlockedCharacters: 0, completion: 0, state: 'incomplete' };
          const isExpanded = state.expandedUniverses.has(node.id);
          if (isExpanded) {
            const entries = getUniverseWorldEntries(node.name)
              .map((entry) => ({ ...entry, type: 'universe-child', worldKey: `universe-child:${entry.id || normalizeUniverseName(entry.name)}` }));
            const worldCount = entries.length;
            const orbitRadius = getWorldOrbitRadius(worldCount);
            const startAngle = ((Math.abs(hashCode(`${node.id}-${worldCount}`)) % 360) * Math.PI) / 180;
            entries.forEach((entry, index) => {
              const angle = startAngle + ((Math.PI * 2 * index) / Math.max(1, worldCount));
              const worldX = Math.round(node.x + Math.cos(angle) * orbitRadius);
              const worldY = Math.round(node.y + Math.sin(angle) * orbitRadius);
              const safeX = Math.round(worldX - WORLD_NODE_HALF_WIDTH);
              const safeY = Math.round(worldY - WORLD_NODE_HALF_HEIGHT);
              const safeWorldName = escapeHtml(entry.name);
              const worldNodeId = entry.id || state.universeNodes.find((item) => normalizeUniverseName(item.name) === normalizeUniverseName(entry.name))?.id || '';
              const floatDelay = ((Math.abs(hashCode(`${entry.id || entry.name}-${index}`)) % 24) / 10).toFixed(1);
              const worldCenterX = worldX;
              const worldCenterY = worldY;
              const baseDx = Math.round(worldCenterX - node.x);
              const baseDy = Math.round(worldCenterY - node.y);
              const connectorVariant = getConnectorVariant(`${node.id}:${entry.worldKey}`);
              const connectorPath = buildConnectorPath(node.x, node.y, worldCenterX, worldCenterY, angle, connectorVariant);
              worldLinks.push(`
                <path
                  class="map-link-path"
                  data-parent-id="${node.id}"
                  data-world-key="${entry.worldKey}"
                  data-base-angle="${angle.toFixed(4)}"
                  data-curve-strength="${connectorVariant.curveStrength}"
                  data-arc-bias="${connectorVariant.arcBias}"
                  data-twist-direction="${connectorVariant.twistDirection}"
                  data-sway="${connectorVariant.sway}"
                  style="--link-width:${connectorVariant.width};"
                  d="${connectorPath}"
                ></path>
              `);
              const childNode = state.universeNodes.find((item) => item.id === entry.id);
              const parentUniverseIds = getParentUniverseIdsForNode(childNode);
              const secondaryParentIds = state.showInteruniversalConnections
                ? parentUniverseIds.filter((parentId) => parentId !== node.id)
                : [];
              secondaryParentIds.forEach((secondaryParentId, secondaryIndex) => {
                const secondaryParent = state.universeNodes.find((item) => item.id === secondaryParentId);
                if (!secondaryParent) return;
                const bridgeAngle = Math.atan2(secondaryParent.y - worldCenterY, secondaryParent.x - worldCenterX);
                const bridgeVariant = getConnectorVariant(`${entry.worldKey}:${secondaryParentId}:${secondaryIndex}`);
                const bridgePath = buildConnectorPath(worldCenterX, worldCenterY, secondaryParent.x, secondaryParent.y, bridgeAngle, {
                  ...bridgeVariant,
                  curveStrength: Math.max(0.12, bridgeVariant.curveStrength * 0.75),
                  arcBias: Math.max(0.16, bridgeVariant.arcBias * 0.7),
                  sway: Math.max(2, Math.round(bridgeVariant.sway * 0.5))
                });
                worldLinks.push(`
                  <path
                    class="map-link-path map-link-path--secondary"
                    data-parent-id="${node.id}"
                    data-source-world-key="${entry.worldKey}"
                    data-secondary-parent-id="${secondaryParentId}"
                    data-world-key="${entry.worldKey}:secondary:${secondaryParentId}"
                    data-curve-strength="${Math.max(0.12, bridgeVariant.curveStrength * 0.75)}"
                    data-arc-bias="${Math.max(0.16, bridgeVariant.arcBias * 0.7)}"
                    data-twist-direction="${bridgeVariant.twistDirection}"
                    data-sway="${Math.max(2, Math.round(bridgeVariant.sway * 0.5))}"
                    d="${bridgePath}"
                  ></path>
                `);
              });
              worldNodes.push(`
                <button
                  class="universe-node universe-node--world"
                  data-world-id="${worldNodeId}"
                  data-world-name="${safeWorldName}"
                  data-world-type="${entry.type}"
                  data-world-key="${entry.worldKey}"
                  data-parent-id="${node.id}"
                  data-base-angle="${angle.toFixed(4)}"
                  data-base-dx="${baseDx}"
                  data-base-dy="${baseDy}"
                  data-locked="${entry.unlocked ? '0' : '1'}"
                  style="left:${safeX}px; top:${safeY}px; --float-delay:-${floatDelay}s;"
                >
                  <div class="orb-container">
                    <img class="universe-cover" src="${getSafeUniverseCover(entry.name, entry.cover)}" alt="Portada de ${safeWorldName}" loading="lazy">
                    <span class="cover-fallback">Sin portada</span>
                  </div>
                  <div class="node-info">
                    <h3>${safeWorldName}</h3>
                  </div>
                </button>
              `);
            });
          }
          const floatDelay = ((Math.abs(hashCode(node.id)) % 24) / 10).toFixed(1);
          const safeName = escapeHtml(node.name);
          const stateClass = universeData.state || 'incomplete';
          return `
            <button class="universe-node universe-node--universe universe-node--${stateClass}" data-node-id="${node.id}" data-open="${safeName}" style="left:${node.x - NODE_HALF_WIDTH}px; top:${node.y - NODE_HALF_HEIGHT}px; --float-delay:-${floatDelay}s;">
              <div class="orb-container">
                <img class="universe-cover" src="${getSafeUniverseCover(node.name, node.cover)}" alt="Portada de ${safeName}" loading="lazy">
                <span class="cover-fallback">Sin portada</span>
              </div>
              <div class="node-info">
                <h3>${safeName}</h3>
              </div>
            </button>
          `;
        }).join('');

        mapWorld.innerHTML = `
          <svg class="map-links-layer" id="mapLinksLayer" viewBox="0 0 ${state.mapCanvas.width} ${state.mapCanvas.height}" preserveAspectRatio="none" aria-hidden="true">
            ${worldLinks.join('')}
          </svg>
          ${absorptionMarkup}
          ${worldNodes.join('')}
          ${nodesMarkup}
        `;
      };

      const closePopup = () => {
        const popup = document.getElementById('mapPopup');
        popup?.remove();
      };

      const openPopupAt = (x, y) => {
        closePopup();
        const popup = document.createElement('div');
        popup.id = 'mapPopup';
        popup.className = 'map-popup';
        popup.style.left = `${Math.max(8, Math.min(x + 8, state.mapCanvas.width - 298))}px`;
        popup.style.top = `${Math.max(8, Math.min(y + 8, state.mapCanvas.height - 250))}px`;
        popup.innerHTML = `
          <form id="mapCreateForm">
            <label>Nombre del universo
              <input type="text" name="nombreUniverso" maxlength="80" required placeholder="Ej. One Piece">
            </label>
            <label>Portada</label>
            <div class="cover-mode" role="group" aria-label="Selector de portada">
              <button type="button" data-cover-mode="url" class="active">URL</button>
              <button type="button" data-cover-mode="file">+</button>
            </div>
            <div class="cover-input-group" data-cover-input="url">
              <input type="url" name="portadaUrl" placeholder="https://...">
            </div>
            <div class="cover-input-group" data-cover-input="file" hidden>
              <input type="file" name="portadaArchivo" accept="image/*">
            </div>
            <button type="submit" class="neon-btn neon-btn--primary">Crear Universo</button>
            <p class="popup-feedback" id="popupFeedback" aria-live="polite"></p>
          </form>
        `;
        popup.addEventListener('click', (event) => event.stopPropagation());
        mapWorld.appendChild(popup);
        setTimeout(() => document.addEventListener('click', closePopup, { once: true }), 0);

        const form = popup.querySelector('#mapCreateForm');
        const feedback = popup.querySelector('#popupFeedback');
        let coverMode = 'url';
        popup.querySelectorAll('[data-cover-mode]').forEach((modeBtn) => {
          modeBtn.addEventListener('click', () => {
            coverMode = modeBtn.dataset.coverMode || 'url';
            popup.querySelectorAll('[data-cover-mode]').forEach(btn => btn.classList.toggle('active', btn === modeBtn));
            popup.querySelectorAll('[data-cover-input]').forEach(group => {
              group.hidden = group.dataset.coverInput !== coverMode;
            });
          });
        });

        form?.addEventListener('submit', async (event) => {
          event.preventDefault();
          if (!feedback) return;
          feedback.style.color = '#ffd2d2';
          feedback.textContent = '';

          const formData = new FormData(form);
          const name = String(formData.get('nombreUniverso') || '').trim();
          if (!name) {
            feedback.textContent = 'El nombre es obligatorio.';
            return;
          }

          const normalized = normalizeUniverseName(name);
          const duplicate = state.universeNodes.some(node => normalizeUniverseName(node.name) === normalized);
          if (duplicate) {
            feedback.textContent = 'Ya existe un universo con ese nombre.';
            return;
          }

          const file = formData.get('portadaArchivo');
          const urlInput = String(formData.get('portadaUrl') || '');
          let cover = '';
          try {
            if (coverMode === 'file' && file instanceof File && file.size > 0) {
              if (!file.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');
              if (file.size > MAX_LOCAL_IMAGE_BYTES) throw new Error('La imagen supera el límite de 2MB.');
              cover = await fileToDataUrl(file);
            } else if (coverMode === 'url' && urlInput.trim()) {
              cover = validateCoverUrl(urlInput);
            }
          } catch (err) {
            feedback.textContent = err.message || 'No se pudo procesar la portada.';
            return;
          }

          const boundedX = Math.max(NODE_HALF_WIDTH, Math.min(Math.round(x), state.mapCanvas.width - NODE_HALF_WIDTH));
          const boundedY = Math.max(NODE_HALF_HEIGHT, Math.min(Math.round(y), state.mapCanvas.height - NODE_HALF_HEIGHT));
          state.universeNodes.push({
            id: cssSafe(`${name}-${Date.now()}`),
            name,
            cover,
            x: boundedX,
            y: boundedY,
            neighbors: [],
            shape: createNodeShape(hashCode(name))
          });
          syncMapCanvasSize();
          saveUniverseNodes();
          closePopup();
          renderMapView();
        });
      };

      if (rebuildWorld) {
        renderMapWorldContent();
      }
      syncMapCanvasSize();

      if (!mapViewRuntime.handlersBound) {
        mapViewRuntime.handlersBound = true;

        viewMap.addEventListener('error', (event) => {
          const coverEl = event.target;
          if (!(coverEl instanceof HTMLImageElement) || !coverEl.classList.contains('universe-cover')) return;
          coverEl.classList.add('is-broken');
          const hostNode = coverEl.closest('.universe-node');
          const fallbackName = hostNode?.dataset.open || hostNode?.dataset.worldName || '';
          coverEl.src = getSafeUniverseCover(fallbackName, '');
        }, true);

        viewMap.addEventListener('click', (event) => {
          const interuniversalBtn = event.target.closest('#mapToolInteruniversal');
          if (!interuniversalBtn) return;
          event.preventDefault();
          state.showInteruniversalConnections = !state.showInteruniversalConnections;
          renderMapView({ rebuildWorld: true });
        });

        viewMap.addEventListener('pointerdown', (event) => {
          const toolBtn = event.target.closest('[data-map-tool]');
          if (toolBtn) {
            event.preventDefault();
            event.stopPropagation();
            const tool = toolBtn.dataset.mapTool || '';
            if (!tool) return;
            resetToolDragState();
            const token = document.createElement('div');
            token.className = `map-tool-token map-tool-token--${tool}`;
            token.setAttribute('aria-hidden', 'true');
            token.textContent = tool === 'blackhole' ? '🕳️' : '💥';
            token.style.left = `${event.clientX}px`;
            token.style.top = `${event.clientY}px`;
            document.body.appendChild(token);
            mapViewRuntime.toolDragState.active = true;
            mapViewRuntime.toolDragState.tool = tool;
            mapViewRuntime.toolDragState.pointerId = event.pointerId;
            mapViewRuntime.toolDragState.tokenEl = token;
            viewMap.classList.add('map-tool-active');
            return;
          }
          const nodeEl = event.target.closest('.universe-node--universe');
          if (!nodeEl) return;
          if (mapViewRuntime.toolDragState.active) return;
          if (event.button !== 0) return;
          const nodeId = nodeEl.dataset.nodeId || '';
          const node = state.universeNodes.find(item => item.id === nodeId);
          if (!node) return;
          event.preventDefault();
          event.stopPropagation();
          mapViewRuntime.dragState.activeNodeId = node.id;
          mapViewRuntime.dragState.pointerId = event.pointerId;
          mapViewRuntime.dragState.startClientX = event.clientX;
          mapViewRuntime.dragState.startClientY = event.clientY;
          mapViewRuntime.dragState.moved = false;
          mapViewRuntime.dragState.activeNodeElement = nodeEl;
          const worldPoint = toWorldPoint(event);
          mapViewRuntime.dragState.offsetX = worldPoint.x - node.x;
          mapViewRuntime.dragState.offsetY = worldPoint.y - node.y;
          nodeEl.dataset.dragMoved = '0';
          mapViewRuntime.dragState.targetNodeId = '';
          updateDragTargetHighlight(node.id, '');
          nodeEl.setPointerCapture(event.pointerId);
        });

        viewMap.addEventListener('pointermove', (event) => {
          if (mapViewRuntime.toolDragState.active && mapViewRuntime.toolDragState.pointerId === event.pointerId) {
            event.preventDefault();
            const tokenEl = mapViewRuntime.toolDragState.tokenEl;
            if (tokenEl) {
              tokenEl.style.left = `${event.clientX}px`;
              tokenEl.style.top = `${event.clientY}px`;
            }
            const target = getToolDropTargetFromPoint(event.clientX, event.clientY);
            mapViewRuntime.toolDragState.targetNodeId = target?.nodeId || '';
            mapViewRuntime.toolDragState.targetType = target?.type || '';
            mapViewRuntime.toolDragState.targetParentId = target?.parentId || '';
            updateToolDropTargetHighlight(
              mapViewRuntime.toolDragState.tool,
              mapViewRuntime.toolDragState.targetNodeId,
              mapViewRuntime.toolDragState.targetType,
              mapViewRuntime.toolDragState.targetParentId
            );
            return;
          }
          if (mapViewRuntime.dragState.pointerId !== event.pointerId) return;
          if (!mapViewRuntime.dragState.activeNodeId) return;
          const nodeEl = mapViewRuntime.dragState.activeNodeElement;
          if (!nodeEl) return;
          const node = state.universeNodes.find(item => item.id === mapViewRuntime.dragState.activeNodeId);
          if (!node) return;
          event.preventDefault();
          const worldPoint = toWorldPoint(event);
          const rawX = worldPoint.x - mapViewRuntime.dragState.offsetX;
          const rawY = worldPoint.y - mapViewRuntime.dragState.offsetY;
          const boundedX = Math.max(NODE_HALF_WIDTH, Math.min(Math.round(rawX), state.mapCanvas.width - NODE_HALF_WIDTH));
          const boundedY = Math.max(NODE_HALF_HEIGHT, Math.min(Math.round(rawY), state.mapCanvas.height - NODE_HALF_HEIGHT));
          node.x = boundedX;
          node.y = boundedY;
          nodeEl.style.left = `${boundedX - NODE_HALF_WIDTH}px`;
          nodeEl.style.top = `${boundedY - NODE_HALF_HEIGHT}px`;
          updateVisibleWorldConnectors();
          const movedDistance = Math.hypot(event.clientX - mapViewRuntime.dragState.startClientX, event.clientY - mapViewRuntime.dragState.startClientY);
          if (!mapViewRuntime.dragState.moved && movedDistance >= DRAG_OPEN_THRESHOLD) {
            mapViewRuntime.dragState.moved = true;
            nodeEl.dataset.dragMoved = '1';
          }
          const targetNode = findDropTargetForNode(node);
          mapViewRuntime.dragState.targetNodeId = targetNode?.id || '';
          updateDragTargetHighlight(mapViewRuntime.dragState.activeNodeId, mapViewRuntime.dragState.targetNodeId);
        });

        const finishDrag = (event) => {
          if (mapViewRuntime.toolDragState.active && mapViewRuntime.toolDragState.pointerId === event.pointerId) {
            event.preventDefault();
            const target = {
              nodeId: mapViewRuntime.toolDragState.targetNodeId,
              type: mapViewRuntime.toolDragState.targetType,
              parentId: mapViewRuntime.toolDragState.targetParentId
            };
            const changed = applyMapToolDrop(mapViewRuntime.toolDragState.tool, target);
            updateToolDropTargetHighlight();
            resetToolDragState();
            if (changed) {
              saveUniverseMemberships();
              saveUniverseNodes();
              renderMapView({ rebuildWorld: true });
            }
            return;
          }
          if (mapViewRuntime.dragState.pointerId !== event.pointerId) return;
          if (!mapViewRuntime.dragState.activeNodeId) return;
          const nodeEl = mapViewRuntime.dragState.activeNodeElement;
          const activeNodeId = mapViewRuntime.dragState.activeNodeId;
          const targetNodeId = mapViewRuntime.dragState.targetNodeId;
          if (nodeEl?.hasPointerCapture(event.pointerId)) {
            nodeEl.releasePointerCapture(event.pointerId);
          }
          const didMove = mapViewRuntime.dragState.moved;
          resetDragState();
          updateDragTargetHighlight('', '');
          if (!didMove) return;
          let membershipsChanged = false;
          if (activeNodeId && targetNodeId && activeNodeId !== targetNodeId) {
            if (wouldCreateUniverseCycle(activeNodeId, targetNodeId)) {
              alert('No se puede crear una relación cíclica entre universos.');
            } else {
              const activeNode = state.universeNodes.find(item => item.id === activeNodeId);
              const targetNode = state.universeNodes.find(item => item.id === targetNodeId);
              if (activeNode && nodeHasChildren(activeNodeId)) {
                alert('No se puede convertir en mundo un universo que ya tiene hijos.');
              } else if (activeNode) {
                if (state.universeMemberships[activeNodeId] !== targetNodeId) {
                  state.universeMemberships[activeNodeId] = targetNodeId;
                  membershipsChanged = true;
                }
                if (activeNode.kind !== 'world') {
                  activeNode.kind = 'world';
                }
                if (activeNode.parentUniverseId !== targetNodeId) {
                  activeNode.parentUniverseId = targetNodeId;
                }
                const existingParents = getParentUniverseIdsForNode(activeNode).filter((parentId) => parentId !== targetNodeId);
                activeNode.parentUniverseIds = [targetNodeId, ...existingParents];
                if (targetNode) {
                  const dx = targetNode.x - activeNode.x;
                  const dy = targetNode.y - activeNode.y;
                  const pathLength = Math.max(32, Math.hypot(dx, dy));
                  state.mapAbsorptionEffect = {
                    startX: activeNode.x,
                    startY: activeNode.y,
                    deltaX: dx,
                    deltaY: dy,
                    pathLength,
                    angleDeg: (Math.atan2(dy, dx) * 180 / Math.PI) + 90
                  };
                  window.setTimeout(() => {
                    state.mapAbsorptionEffect = null;
                    if (state.view === 'map') renderMapView({ rebuildWorld: true });
                  }, 760);
                  state.expandedUniverses.delete(activeNodeId);
                }
              }
            }
          }
          saveUniverseNodes();
          if (membershipsChanged) saveUniverseMemberships();
          if (membershipsChanged || state.mapAbsorptionEffect) {
            renderMapView({ rebuildWorld: true });
            return;
          }
          syncMapCanvasSize();
        };

        viewMap.addEventListener('pointerup', finishDrag);
        viewMap.addEventListener('pointercancel', finishDrag);

        viewMap.addEventListener('click', (event) => {
          const worldEl = event.target.closest('.universe-node--world');
          if (worldEl) {
            event.preventDefault();
            event.stopPropagation();
            const worldName = worldEl.dataset.worldName;
            if (!worldName) return;
            state.universe = worldName;
            state.selectedVideoId = null;
            state.showAddForm = false;
            state.showEditUniverseForm = false;
            changeView('universe');
            return;
          }

          const nodeEl = event.target.closest('.universe-node--universe');
          if (!nodeEl) return;
          if (nodeEl.dataset.dragMoved === '1') {
            nodeEl.dataset.dragMoved = '0';
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          event.stopPropagation();
          const clickedNodeId = nodeEl.dataset.nodeId || '';
          if (state.expandedUniverses.has(clickedNodeId)) {
            state.expandedUniverses.delete(clickedNodeId);
          } else {
            state.expandedUniverses.add(clickedNodeId);
            const clickedNode = state.universeNodes.find((item) => item.id === clickedNodeId);
            if (clickedNode) {
              const orbitRadius = getWorldOrbitRadius(getUniverseWorldEntries(clickedNode.name).length);
              if (orbitRadius > 0) {
                const marginX = orbitRadius + WORLD_NODE_HALF_WIDTH;
                const marginY = orbitRadius + WORLD_NODE_HALF_HEIGHT;
                const boundedX = Math.max(marginX, Math.min(clickedNode.x, state.mapCanvas.width - marginX));
                const boundedY = Math.max(marginY, Math.min(clickedNode.y, state.mapCanvas.height - marginY));
                if (boundedX !== clickedNode.x || boundedY !== clickedNode.y) {
                  clickedNode.x = Math.round(boundedX);
                  clickedNode.y = Math.round(boundedY);
                  saveUniverseNodes();
                }
              }
            }
          }
          renderMapView({ rebuildWorld: true });
        });

        viewMap.addEventListener('contextmenu', (event) => {
          const world = event.target.closest('#mapWorld');
          if (!world) return;
          event.preventDefault();
          event.stopPropagation();
          const rect = mapCanvas.getBoundingClientRect();
          const scale = state.mapViewport.scale || 1;
          const worldX = (event.clientX - rect.left + mapShell.scrollLeft) / scale;
          const worldY = (event.clientY - rect.top + mapShell.scrollTop) / scale;
          openPopupAt(worldX, worldY);
        });

        mapShell.addEventListener('wheel', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.deltaY === 0) return;
          const rect = mapCanvas.getBoundingClientRect();
          const scale = state.mapViewport.scale || 1;
          const worldX = (event.clientX - rect.left + mapShell.scrollLeft) / scale;
          const worldY = (event.clientY - rect.top + mapShell.scrollTop) / scale;
          const direction = event.deltaY < 0 ? 1 : -1;
          const nextScale = direction > 0
            ? scale * WHEEL_ZOOM_FACTOR
            : scale / WHEEL_ZOOM_FACTOR;
          applyMapScale(nextScale, {
            x: worldX,
            y: worldY,
            pointerX: event.clientX - rect.left,
            pointerY: event.clientY - rect.top
          });
        }, { passive: false });

        window.addEventListener('resize', syncMapCanvasSize, { once: true });
      }
    }

    function renderInicioView() {
      const universeMap = groupByUniverse();
      const totalUniverses = Object.keys(universeMap).length;
      const totalVideos = collectionModel.videos.length || VIDEOS.length;
      const totalCharacters = collectionModel.characters.length || new Set(
        VIDEOS.map(video => (video.personaje || '').trim()).filter(Boolean)
      ).size;
      const latestFromVideos = VIDEOS.slice(-6).reverse();
      const mockLatest = [
        { titulo: 'Conexión dimensional iniciada', universo: 'Multiverso base', personaje: 'Narrador central' },
        { titulo: 'Primer contacto con sector alfa', universo: 'Sector Alfa', personaje: 'Comandante Nova' },
        { titulo: 'Diagnóstico de señales en progreso', universo: 'Observatorio Éter', personaje: 'Analista Kira' }
      ];
      const latestTransmissions = latestFromVideos.length ? latestFromVideos : mockLatest;

      viewInicio.innerHTML = `
        <section class="panel">
          <h2>Voces Universales</h2>
          <p class="muted">Centro de control de exploración.</p>
        </section>

        <section class="grid">
          <article class="card">
            <h3 class="universe-name">🪐 Total universos</h3>
            <p class="muted">${totalUniverses}</p>
          </article>
          <article class="card">
            <h3 class="universe-name">🎬 Total videos</h3>
            <p class="muted">${totalVideos}</p>
          </article>
          <article class="card">
            <h3 class="universe-name">🎭 Personajes únicos</h3>
            <p class="muted">${totalCharacters}</p>
          </article>
        </section>

        <section class="panel">
          <h3>Últimas transmisiones</h3>
          <div class="video-grid">
            ${latestTransmissions.slice(0, 6).map((video, index) => `
              <article class="card">
                <h4>${video.titulo || `Transmisión #${index + 1}`}</h4>
                <p class="muted">Universo: ${(Array.isArray(video.universo) ? video.universo[0] : video.universo) || 'Sin universo'}</p>
                <p class="muted">Personaje: ${video.personaje || 'Sin personaje'}</p>
                ${video.personaje ? `<button class="character-link" data-open-character="${video.personaje}">Ver perfil</button>` : ''}
              </article>
            `).join('')}
          </div>
        </section>
      `;
      viewInicio.querySelectorAll('[data-open-character]').forEach((btn) => {
        btn.addEventListener('click', () => openCharacterProfile(btn.dataset.openCharacter));
      });
    }

    function renderUniverseView() {
      const videos = getUniverseVideos(); // Todos los videos del universo
    const playableVideos = videos.filter((video) => hasGreetingVideo(video));
    
    // Contamos personajes únicos de la lista TOTAL (desbloqueados o no)
    const totalCharactersInUniverse = new Set(
      videos.map((video) => String(video.personaje || '').trim()).filter(Boolean)
    ).size;
      const universeMap = groupByUniverse();
      const selectedUniverseKey = normalizeUniverseName(state.universe || '');
      const universeData = universeMap[selectedUniverseKey] || { totalCharacters: 0, unlockedCharacters: 0, completion: 0, state: 'incomplete' };
      const rarezas = ['Común', 'Raro', 'Épico', 'Legendario'];
      const universeCharacters = [...new Set(videos.map(v => String(v.personaje || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
      const defaultCharacterForVideo = universeCharacters[0] || '';
      const getActorsForUniverseCharacter = (characterName) => {
        if (!characterName) return [];
        const normalizedCharacter = normalizeName(characterName);
        const actorsInVideos = videos
          .filter(v => normalizeName(v.personaje || '') === normalizedCharacter)
          .map(v => String(v.actor_de_doblaje || '').trim())
          .filter(Boolean);
        const blockedActors = Object.entries(state.blockedCharactersByActor || {})
          .filter(([, list]) => Array.isArray(list) && list.some(item => normalizeName(item) === normalizedCharacter))
          .map(([actorName]) => String(actorName || '').trim())
          .filter(Boolean);
        const merged = [...new Set([...actorsInVideos, ...blockedActors])]
          .filter(name => normalizeName(name) !== normalizeName('Sin actor'))
          .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        return merged.length ? merged : ['Sin actor'];
      };
      const characterActorsMap = universeCharacters.reduce((acc, characterName) => {
        acc[characterName] = getActorsForUniverseCharacter(characterName);
        return acc;
      }, {});
      const defaultActorsForVideo = getActorsForUniverseCharacter(defaultCharacterForVideo);
      const filtered = getFilteredUniverseVideos().filter((video) => {
        const personaje = (video.personaje || '').toLowerCase();
        const actor = (video.actor_de_doblaje || '').toLowerCase();
        return personaje.includes(state.search.personaje.toLowerCase()) && actor.includes(state.search.actor.toLowerCase());
      });
      const groupedCharacters = [];
      filtered.reduce((acc, video) => {
        const characterName = String(video.personaje || 'Sin personaje').trim() || 'Sin personaje';
        const normalizedCharacter = normalizeName(characterName);
        if (!acc[normalizedCharacter]) {
          acc[normalizedCharacter] = {
            characterName,
            videos: [],
            coverVideo: null,
            actors: new Set()
          };
          groupedCharacters.push(acc[normalizedCharacter]);
        }
        const record = acc[normalizedCharacter];
        record.videos.push(video);
        const actorName = String(video.actor_de_doblaje || '').trim();
        if (actorName && normalizeName(actorName) !== normalizeName('Sin actor')) record.actors.add(actorName);
        if (!record.coverVideo || (!hasGreetingVideo(record.coverVideo) && hasGreetingVideo(video))) {
          record.coverVideo = video;
        }
        return acc;
      }, {});
      const groupedCharacterCards = groupedCharacters
        .map((record) => ({
          ...record,
          unlocked: record.videos.some(video => hasGreetingVideo(video)),
          actorsList: [...record.actors].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
        }))
        .sort((a, b) => a.characterName.localeCompare(b.characterName, 'es', { sensitivity: 'base' }));
      const universeNode = state.universeNodes.find(node => normalizeUniverseName(node.name) === selectedUniverseKey);
      const linkedUniverseNames = getParentUniverseIdsForNode(universeNode)
        .map((parentId) => state.universeNodes.find((node) => node.id === parentId)?.name || '')
        .filter(Boolean);
      const parentUniverseOptions = state.universeNodes
        .filter((node) => node.id !== universeNode?.id && String(node.kind || 'universe') === 'universe')
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' }));
      const headerCover = getSafeUniverseCover(state.universe, universeNode?.cover || getUniverseCover(videos));
      const progressVisual = getProgressVisual(universeData.completion);
      const editFeedbackText = state.editUniverseFeedback?.text || '';
      const editFeedbackClass = state.editUniverseFeedback?.type === 'success' ? 'is-success' : '';
      viewUniverse.innerHTML = `
        <div class="actions universe-view-animated">
          <button id="backMap" class="neon-btn">← Volver al mapa</button>
        </div>
        <section class="hud-panel universe-header universe-view-animated" style="--progress-color:${progressVisual.color};">
          <div class="universe-hero">
            <img src="${headerCover}" alt="Portada de ${state.universe}">
            <div class="universe-meta">
              <h2 class="section-title">${state.universe || 'Universo'}</h2>
              <div class="universe-stat-lines">
                <p>Personajes: ${totalCharactersInUniverse}</p>
                <p>Video: ${playableVideos.length}</p>
              </div>
              <div class="collection-kpi" style="margin-top:10px;">
                <div class="collection-progress" aria-hidden="true">
                  <div class="collection-progress-bar" style="--collection-progress:${universeData.completion}%; width:${universeData.completion}%;"></div>
                </div>
                <p class="progress-percent">${universeData.completion}%</p>
              </div>
            </div>
          </div>
          <div class="universe-controls" style="display: flex; flex-direction: column; gap: 10px; align-items: flex-end;">
            <button id="favUniverseBtn" class="neon-btn neon-action icon-only" title="Favorito" style="font-size: 1.5rem;">
              ${universeNode?.isFavorite ? '⭐' : '☆'}
            </button>

            <div style="display: flex; gap: 10px;">
              <button
                id="toggleEditUniverseForm"
                class="neon-btn neon-action icon-only edit"
                aria-expanded="${state.showEditUniverseForm ? 'true' : 'false'}"
                title="${state.showEditUniverseForm ? 'Cerrar edición' : 'Editar universo'}"
              >
                ✏️
              </button>
              <button id="blackHoleDeleteUniverse" class="neon-btn neon-action icon-only blackhole" title="Borrar universo">🕳️</button>
            </div>

            <div style="display: flex; gap: 10px;">
              <button id="btn-toggle-video" class="neon-btn neon-btn--primary neon-action">
                ${state.showAddForm && state.universeAddMode === 'video' ? 'CERRAR' : '🎥'}
              </button>
              <button id="btn-add-blocked-character" class="neon-btn neon-action">
                ${state.showAddForm && state.universeAddMode === 'character' ? 'CERRAR' : '👤'}
              </button>
            </div>
          </div>
          ${state.showEditUniverseForm ? `
            <section class="hud-panel universe-edit-panel">
              <form id="editUniverseForm" class="universe-edit-form">
                <label>Nombre del universo
                  <input
                    type="text"
                    name="nombreUniverso"
                    maxlength="80"
                    required
                    value="${escapeHtml(state.universe || '')}"
                    placeholder="Ej. Dragon Ball"
                  >
                </label>
                <label>Universos padre vinculados
                  <select name="universosLigados" multiple size="${Math.max(3, Math.min(8, parentUniverseOptions.length || 3))}">
                    ${parentUniverseOptions.length
                      ? parentUniverseOptions.map((node) => `
                        <option value="${escapeHtml(node.name || '')}" ${linkedUniverseNames.some((name) => normalizeUniverseName(name) === normalizeUniverseName(node.name)) ? 'selected' : ''}>
                          ${escapeHtml(node.name || '')}
                        </option>
                      `).join('')
                      : '<option value="" disabled>No hay universos padre disponibles</option>'}
                  </select>
                  <span class="muted">Solo se muestran universos padre. Mantén Ctrl/Cmd para seleccionar varios.</span>
                </label>
                <label>Portada</label>
                <div class="cover-mode" role="group" aria-label="Selector de portada de edición">
                  <button type="button" data-edit-cover-mode="url" class="active">URL</button>
                  <button type="button" data-edit-cover-mode="file">+</button>
                </div>
                <div class="cover-input-group" data-edit-cover-input="url">
                  <input
                    type="url"
                    name="portadaUrl"
                    value="${(universeNode?.cover || '').startsWith('http') ? escapeHtml(universeNode.cover) : ''}"
                    placeholder="https://..."
                  >
                </div>
                <div class="cover-input-group" data-edit-cover-input="file" hidden>
                  <input type="file" name="portadaArchivo" accept="image/*">
                </div>
                <div class="universe-edit-actions">
                  <button type="submit" class="neon-btn neon-btn--primary">Guardar cambios</button>
                  <span class="muted">Si dejas portada vacía, se mantiene la actual.</span>
                </div>
                <p id="editUniverseFeedback" class="universe-edit-feedback ${editFeedbackClass}" aria-live="polite">${escapeHtml(editFeedbackText)}</p>
              </form>
            </section>
          ` : ''}
        </section>

        <form id="form-agregar-video" class="add-video-form" style="display:${state.showAddForm ? 'grid' : 'none'};">
          ${state.universeAddMode === 'video' ? `
            <label>URL de YouTube (Requerido)
              <input type="url" name="url_youtube" required placeholder="https://www.youtube.com/watch?v=...">
            </label>
            <label>Personaje (Requerido)
              <select name="personaje" required ${universeCharacters.length ? '' : 'disabled'}>
                ${universeCharacters.length
                  ? universeCharacters.map(name => `<option value="${name}">${name}</option>`).join('')
                  : '<option value="">No hay personajes en este universo</option>'}
              </select>
            </label>
            <label>Actor de doblaje (Requerido)
              <select name="actor_de_doblaje" required ${universeCharacters.length ? '' : 'disabled'}>
                ${defaultActorsForVideo.map(actorName => `<option value="${actorName}">${actorName}</option>`).join('')}
              </select>
            </label>
          ` : `
            <label>Nombre del Personaje (Requerido)
              <input type="text" name="personaje" required placeholder="Ej. Gokú">
            </label>
            <label>Rareza
              <select name="rareza">
                ${rarezas.map(r => `<option value="${r}">${r}</option>`).join('')}
              </select>
            </label>
            <label>Actores de doblaje (Opcional)
              <input type="text" name="actor_de_doblaje" placeholder="Ej. Mario Castañeda, Laura Torres">
            </label>
            <label>URL de YouTube (Opcional)
              <input type="url" name="url_youtube" placeholder="https://www.youtube.com/watch?v=...">
            </label>
          `}
          <div class="actions">
            <button type="submit" class="neon-btn neon-btn--primary">${state.universeAddMode === 'video' ? 'Desbloquear Personaje' : 'Agregar Personaje'}</button>
            <span class="muted" id="videoFormFeedback"></span>
          </div>
        </form>

        <div class="universe-toolbar universe-view-animated">
          <button id="openFilters" class="neon-btn icon-btn neon-action" aria-label="Abrir filtros" aria-expanded="false">
            <span>🔍</span>
          </button>
        </div>

        <div class="universe-gallery-layout universe-view-animated">
          <section class="hud-panel">
            <section class="characters-gallery">
              ${groupedCharacterCards.map(item => renderCharacterGalleryCard({
                name: item.characterName,
                coverVideo: item.coverVideo,
                rareza: item.coverVideo?.rareza || 'Común',
                unlocked: item.unlocked
              }, { locked: !item.unlocked })).join('') || '<p class="muted">No hay resultados con estos filtros.</p>'}
            </section>
          </section>
        </div>
        <aside id="filtersPanel" class="hud-panel filter-sidebar" aria-hidden="true">
          <div class="filter-sidebar-head">
            <h3 class="section-title" style="margin:0;">Filtros</h3>
            <button id="closeFilters" class="neon-btn icon-btn neon-action" aria-label="Cerrar filtros"><span>✕</span></button>
          </div>
          <label>Buscar personaje
            <input id="searchCharacter" type="search" value="${state.search.personaje}" placeholder="Ej. Goku">
          </label>
          <label>Buscar actor
            <input id="searchActor" type="search" value="${state.search.actor}" placeholder="Ej. Mario Castañeda">
          </label>
          <label>Rareza
            <select id="filterRarity">
              <option value="todos">Todas</option>
              ${rarezas.map(r => `<option value="${r}" ${state.filters.rareza === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </label>
          <button id="clearFilters" class="neon-btn neon-action">Limpiar filtros</button>
        </aside>
      `;

      document.getElementById('backMap').onclick = () => changeView('map');
      const btnToggleVideo = document.getElementById('btn-toggle-video');
      const btnAddBlockedCharacter = document.getElementById('btn-add-blocked-character');
      const formAgregarVideo = document.getElementById('form-agregar-video');
      const videoCharacterSelect = formAgregarVideo?.querySelector('[name="personaje"]');
      const videoActorSelect = formAgregarVideo?.querySelector('[name="actor_de_doblaje"]');
      btnToggleVideo?.addEventListener('click', () => {
        if (state.showAddForm && state.universeAddMode === 'video') {
          state.showAddForm = false;
        } else {
          state.showAddForm = true;
          state.universeAddMode = 'video';
        }
        renderUniverseView();
        if (state.showAddForm) document.getElementById('form-agregar-video')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      btnAddBlockedCharacter?.addEventListener('click', () => {
        if (state.showAddForm && state.universeAddMode === 'character') {
          state.showAddForm = false;
        } else {
          state.showAddForm = true;
          state.universeAddMode = 'character';
        }
        renderUniverseView();
        if (state.showAddForm) document.getElementById('form-agregar-video')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      const syncVideoActorOptions = () => {
        if (!videoCharacterSelect || !videoActorSelect || state.universeAddMode !== 'video') return;
        const selectedCharacter = String(videoCharacterSelect.value || '');
        const actors = characterActorsMap[selectedCharacter] || [];
        videoActorSelect.innerHTML = actors.map(actorName => `<option value="${actorName}">${actorName}</option>`).join('')
          || '<option value="">Sin actores asociados</option>';
      };
      videoCharacterSelect?.addEventListener('change', syncVideoActorOptions);
      syncVideoActorOptions();
      const toggleEditUniverseFormBtn = document.getElementById('toggleEditUniverseForm');
      toggleEditUniverseFormBtn?.addEventListener('click', () => {
        state.showEditUniverseForm = !state.showEditUniverseForm;
        if (!state.showEditUniverseForm) state.editUniverseFeedback = { type: '', text: '' };
        renderUniverseView();
      });
      const editUniverseForm = document.getElementById('editUniverseForm');
      let editCoverMode = 'url';
      editUniverseForm?.querySelectorAll('[data-edit-cover-mode]').forEach((modeBtn) => {
        modeBtn.addEventListener('click', () => {
          editCoverMode = modeBtn.dataset.editCoverMode || 'url';
          editUniverseForm.querySelectorAll('[data-edit-cover-mode]').forEach(btn => btn.classList.toggle('active', btn === modeBtn));
          editUniverseForm.querySelectorAll('[data-edit-cover-input]').forEach(group => {
            group.hidden = group.dataset.editCoverInput !== editCoverMode;
          });
        });
      });
      editUniverseForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(editUniverseForm);
        const cleanName = String(formData.get('nombreUniverso') || '').trim();
        const linkedUniverseNames = [...new Set(
          formData
            .getAll('universosLigados')
            .map((item) => String(item || '').trim())
            .filter(Boolean)
        )];
        if (!cleanName) {
          state.editUniverseFeedback = { type: 'error', text: 'El nombre del universo es obligatorio.' };
          renderUniverseView();
          return;
        }
        const currentUniverseKey = normalizeUniverseName(state.universe || '');
        const cleanNameKey = normalizeUniverseName(cleanName);
        const isDuplicate = state.universeNodes.some(node =>
          normalizeUniverseName(node.name) === cleanNameKey && normalizeUniverseName(node.name) !== currentUniverseKey
        );
        if (isDuplicate) {
          state.editUniverseFeedback = { type: 'error', text: 'Ya existe un universo con ese nombre.' };
          renderUniverseView();
          return;
        }
        const file = formData.get('portadaArchivo');
        const rawCoverUrl = String(formData.get('portadaUrl') || '');
        let nextCover = universeNode?.cover || '';
        try {
          if (editCoverMode === 'file' && file instanceof File && file.size > 0) {
            if (!file.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');
            if (file.size > MAX_LOCAL_IMAGE_BYTES) throw new Error('La imagen supera el límite de 2MB.');
            nextCover = await fileToDataUrl(file);
          } else if (editCoverMode === 'url' && rawCoverUrl.trim()) {
            nextCover = validateCoverUrl(rawCoverUrl);
          }
        } catch (err) {
          state.editUniverseFeedback = { type: 'error', text: err.message || 'No se pudo procesar la portada.' };
          renderUniverseView();
          return;
        }
        VIDEOS.forEach(video => {
          const list = getVideoUniverses(video).map(u => normalizeUniverseName(u) === currentUniverseKey ? cleanName : u);
          video.universo = [...new Set(list)];
        });
        if (universeNode) {
          universeNode.name = cleanName;
          universeNode.cover = nextCover || '';
          if (linkedUniverseNames.length) {
            const selectedParentUniverseIds = linkedUniverseNames
              .map((linkedName) => state.universeNodes.find((node) =>
                node.id !== universeNode.id
                && String(node.kind || 'universe') === 'universe'
                && normalizeUniverseName(node.name) === normalizeUniverseName(linkedName)
              ))
              .filter(Boolean)
              .map((node) => node.id)
              .filter((parentId) => parentId !== universeNode.id);
            const existingParentUniverseIds = getParentUniverseIdsForNode(universeNode)
              .filter((parentId) => parentId !== universeNode.id);
            const parentUniverseIds = [...new Set([
              ...existingParentUniverseIds,
              ...selectedParentUniverseIds
            ])];
            const currentPrimaryParentId = String(state.universeMemberships[universeNode.id] || universeNode.parentUniverseId || '').trim();
            const preferredPrimaryParentId = selectedParentUniverseIds[0] || '';
            const primaryParentId = (
              (currentPrimaryParentId && parentUniverseIds.includes(currentPrimaryParentId) && currentPrimaryParentId)
              || (preferredPrimaryParentId && parentUniverseIds.includes(preferredPrimaryParentId) && preferredPrimaryParentId)
              || parentUniverseIds[0]
              || ''
            );
            if (primaryParentId) {
              state.universeMemberships[universeNode.id] = primaryParentId;
              universeNode.kind = 'world';
            } else {
              delete state.universeMemberships[universeNode.id];
              universeNode.kind = 'universe';
            }
            universeNode.parentUniverseId = primaryParentId;
            universeNode.parentUniverseIds = primaryParentId
              ? [primaryParentId, ...parentUniverseIds.filter((id) => id !== primaryParentId)]
              : [];
          } else {
            delete state.universeMemberships[universeNode.id];
            universeNode.parentUniverseId = '';
            universeNode.parentUniverseIds = [];
            universeNode.kind = 'universe';
          }
        }
        state.universe = cleanName;
        state.editUniverseFeedback = { type: 'success', text: 'Universo actualizado correctamente.' };
        sanitizeUniverseMembershipsAndPersist();
        saveUniverseMemberships();
        saveUniverseNodes();
        saveVideos();
        renderMapView();
        renderUniverseView();
      });
      document.getElementById('blackHoleDeleteUniverse').onclick = () => {
        const ok = confirm(`🕳️ Agujero negro\n\n¿Borrar por completo el universo "${state.universe}"?\n\n• Sus mundos hijos quedarán dispersos como universos.\n• Los personajes que solo estaban aquí pasarán a "Sin universo".`);
        if (!ok) return;
        const currentUniverseKey = normalizeUniverseName(state.universe || '');
        const removedNode = state.universeNodes.find(node => normalizeUniverseName(node.name) === currentUniverseKey);
        state.universeNodes = state.universeNodes.filter(node => normalizeUniverseName(node.name) !== currentUniverseKey)
          .map((node) => {
            const isDirectChildOfRemovedUniverse = Boolean(removedNode?.id) && String(state.universeMemberships[node.id] || '').trim() === removedNode.id;
            const parentIds = getParentUniverseIdsForNode(node).filter((id) => id !== removedNode?.id);
            const primaryParentId = isDirectChildOfRemovedUniverse
              ? ''
              : String(state.universeMemberships[node.id] || '').trim();
            const normalizedParentIds = isDirectChildOfRemovedUniverse
              ? []
              : (primaryParentId
                ? [primaryParentId, ...parentIds.filter((id) => id !== primaryParentId)]
                : parentIds);
            return {
              ...node,
              parentUniverseIds: normalizedParentIds,
              parentUniverseId: primaryParentId || '',
              kind: normalizedParentIds.length ? 'world' : 'universe'
            };
          });
        if (removedNode?.id) {
          delete state.universeMemberships[removedNode.id];
          Object.keys(state.universeMemberships).forEach((childId) => {
            if (state.universeMemberships[childId] === removedNode.id) delete state.universeMemberships[childId];
          });
        }
        VIDEOS.forEach(video => {
          const remainingUniverses = getVideoUniverses(video).filter(name => normalizeUniverseName(name) !== currentUniverseKey);
          video.universo = remainingUniverses.length ? remainingUniverses : [SPECIAL_UNASSIGNED_UNIVERSE];
        });
        sanitizeUniverseMembershipsAndPersist();
        saveUniverseMemberships();
        saveUniverseNodes();
        saveVideos();
        state.universe = null;
        changeView('map');
      };

      const addVideoForm = document.getElementById('form-agregar-video');
      addVideoForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const feedback = document.getElementById('videoFormFeedback');
        const formData = new FormData(addVideoForm);
        const characterName = String(formData.get('personaje') || '').trim();
        const actorName = String(formData.get('actor_de_doblaje') || '').trim();
        if (state.universeAddMode === 'character') {
          if (!characterName) {
            if (feedback) feedback.textContent = 'Debes completar el nombre del personaje.';
            return;
          }

          // VALIDAR SI YA EXISTE EN ESTE UNIVERSO
          const yaExiste = VIDEOS.find(v => 
            v.personaje.toLowerCase() === characterName.toLowerCase() && 
            v.universo.includes(state.universe)
          );

          if (yaExiste) {
            if (feedback) feedback.textContent = 'Este personaje ya está en el universo.';
            return;
          }
          
          const rarezaValue = String(formData.get('rareza') || 'Común');
          const rawUrl = String(formData.get('url_youtube') || '').trim();
          const normalizedUrl = rawUrl ? normalizeYoutubeUrl(rawUrl) : '';
          if (rawUrl && !normalizedUrl) {
            if (feedback) feedback.textContent = 'URL de YouTube inválida.';
            return;
          }
          const metadata = normalizedUrl ? await fetchYoutubeMetadata(normalizedUrl) : null;
          const actorList = actorName
            ? [...new Set(actorName.split(',').map(item => item.trim()).filter(Boolean))]
            : ['Sin actor'];
          actorList.forEach((actorItem, idx) => {
            const unlocked = Boolean(normalizedUrl);
            VIDEOS.push({
              id: `${unlocked ? 'video' : 'video-bloqueado'}-${Date.now()}-${idx}`,
              titulo: unlocked
                ? (metadata?.title || `Saludo de ${characterName}`)
                : `Registro bloqueado de ${characterName}`,
              universo: [state.universe],
              personaje: characterName,
              actor_de_doblaje: actorItem,
              url_youtube: unlocked ? normalizedUrl : '',
              rareza: rarezaValue,
              thumbnail: unlocked
                ? (metadata?.thumbnail || createPlaceholderCover(characterName))
                : createPlaceholderCover(state.universe)
            });
            if (unlocked) unlockBlockedCharacterForActor(actorItem, characterName);
            else if (normalizeName(actorItem) !== normalizeName('Sin actor')) blockCharacterForActor(actorItem, characterName);
          });
          saveBlockedCharacters();
          
          saveVideos();
          refreshDependentViews();

          if (feedback) feedback.textContent = normalizedUrl
            ? 'Personaje agregado y desbloqueado.'
            : 'Personaje agregado como bloqueado.';
          addVideoForm.reset();
          state.showAddForm = false;
          renderUniverseView();
          return;
        }

        if (!characterName) {
          if (feedback) feedback.textContent = 'Debes elegir un personaje de este universo.';
          return;
        }
        const urlInput = String(formData.get('url_youtube') || '').trim();
        const normalizedUrl = normalizeYoutubeUrl(urlInput);
        if (!normalizedUrl) {
          if (feedback) feedback.textContent = 'URL de YouTube inválida.';
          return;
        }
        if (feedback) feedback.textContent = 'Guardando...';
        const metadata = await fetchYoutubeMetadata(normalizedUrl);
        const newVideo = {
          id: `video-${Date.now()}`,
          universo: [state.universe],
          personaje: characterName || 'Sin personaje',
          actor_de_doblaje: actorName || 'Sin actor',
          url_youtube: normalizedUrl,
          thumbnail: metadata.thumbnail,
          titulo: metadata.title,
          rareza: String(formData.get('rareza') || 'Común')
        };
        VIDEOS.push(newVideo);
        unlockBlockedCharacterForActor(newVideo.actor_de_doblaje, newVideo.personaje);
        saveVideos();
        state.showAddForm = false;
        state.selectedVideoId = newVideo.id;
        renderMapView();
        renderUniverseView();
      });

      document.getElementById('clearFilters').onclick = () => {
        state.filters = { personaje: 'todos', actor: 'todos', rareza: 'todos' };
        state.search = { personaje: '', actor: '' };
        renderUniverseView();
      };

      const filtersPanel = document.getElementById('filtersPanel');
      const openFiltersBtn = document.getElementById('openFilters');
      const closeFiltersBtn = document.getElementById('closeFilters');
      const setFiltersPanel = (isOpen) => {
        if (!filtersPanel) return;
        filtersPanel.classList.toggle('is-open', isOpen);
        filtersPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        openFiltersBtn?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      };
      openFiltersBtn?.addEventListener('click', () => setFiltersPanel(true));
      closeFiltersBtn?.addEventListener('click', () => setFiltersPanel(false));
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setFiltersPanel(false);
      }, { once: true });

      document.getElementById('searchCharacter').oninput = (e) => { state.search.personaje = e.target.value; renderUniverseView(); };
      document.getElementById('searchActor').oninput = (e) => { state.search.actor = e.target.value; renderUniverseView(); };
      document.getElementById('filterRarity').onchange = (e) => { state.filters.rareza = e.target.value; renderUniverseView(); };

      viewUniverse.querySelectorAll('[data-open-character]').forEach((btn) => {
        btn.addEventListener('click', (event) => {
          event.stopPropagation();
          const characterName = btn.dataset.openCharacter;
          if (!characterName) return;
          openCharacterProfile(characterName);
        });
      });
      const favBtn = document.getElementById('favUniverseBtn');
      if (favBtn) {
        favBtn.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const currentUniverse = state.universe;
          const currentNode = getNodeByNormalizedUniverseName(currentUniverse);
          if (!currentNode) return;

          currentNode.isFavorite = !currentNode.isFavorite;
          syncFavoriteUniverseSetFromNodes();
          saveUniverseNodes();
          await flushCloudSync();

          renderUniverseView();
          renderMapView();
        };
      }
    }

    function openVideoDetail(videoId) {
      const video = VIDEOS.find(v => v.id === videoId);
      if (!video) return;
      const personaje = video.personaje || 'Sin personaje';
      const actor = video.actor_de_doblaje || 'Sin actor';
      const hasPlayableVideo = hasGreetingVideo(video);

      const universosRelacionados = [...new Set(
        VIDEOS.filter(v => (v.personaje || 'Sin personaje') === personaje)
          .flatMap(v => getVideoUniverses(v))
      )];
      const actoresDelPersonaje = [...new Set(
        VIDEOS.filter(v => (v.personaje || 'Sin personaje') === personaje)
          .map(v => v.actor_de_doblaje || 'Sin actor')
      )];
      const videoPreviewMarkup = hasPlayableVideo
        ? `
          <img src="${getVideoThumbnail(video)}" alt="Miniatura del video de ${personaje}">
          <div class="preview-overlay">
            <button class="play-btn" id="playVideoPreview" aria-label="Reproducir saludo">Reproducir saludo</button>
          </div>
        `
        : `
          <div class="locked-preview" aria-label="Personaje bloqueado, sin URL de saludo disponible">
            <div class="locked-labels">
              <strong>BLOQUEADO</strong>
              <span>Aún no se han agregado URL para este personaje.</span>
            </div>
          </div>
        `;
      const videoNote = hasPlayableVideo
        ? 'El saludo inicia solo cuando haces click en “Reproducir saludo”.'
        : 'Este personaje todavía no tiene un saludo cargado.';

      const modal = document.createElement('section');
      modal.className = 'detail-modal';
      modal.innerHTML = `
        <article class="detail-content">
          <button class="detail-close neon-btn" id="closeDetail">✕ Cerrar</button>
          <div class="detail-grid">
            <section class="hud-panel holo-card">
              <h3 class="section-title detail-character">${personaje}</h3>
              <p class="detail-meta"><strong>Actor de doblaje:</strong> <button class="detail-actor-link" data-open-actor="${actor}">${actor}</button></p>
              <div class="video-preview" data-video-preview>
                ${videoPreviewMarkup}
              </div>
              <p class="section-note">${videoNote}</p>
            </section>
            <aside class="hud-panel holo-card">
              <h4 class="section-title">Rareza</h4>
              <div class="rarity-highlight ${rarityClass(video.rareza || 'Común')}">${video.rareza || 'Común'}</div>
              <h4 class="section-title">Universos relacionados</h4>
              <ul class="detail-list detail-list-soft">${universosRelacionados.map(u => `<li>${u}</li>`).join('') || '<li>Sin datos</li>'}</ul>
              <h4 class="section-title">Actores de doblaje</h4>
              <ul class="detail-list detail-list-soft">${actoresDelPersonaje.map(nombre => `<li>${nombre}</li>`).join('') || '<li>Sin datos</li>'}</ul>
              <div class="actions">
                <button id="openCharacterProfile" class="neon-btn">Ver perfil del personaje</button>
                <button id="editVideo" class="neon-btn">Editar personaje/video</button>
                <button id="deleteVideo" class="neon-btn">Eliminar personaje/video</button>
              </div>
            </aside>
          </div>
        </article>
      `;
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.remove();
      });
      document.body.appendChild(modal);
      modal.querySelector('#closeDetail')?.addEventListener('click', () => modal.remove());
      if (hasPlayableVideo) {
        modal.querySelector('#playVideoPreview')?.addEventListener('click', () => {
          const target = modal.querySelector('[data-video-preview]');
          if (!target) return;
          target.innerHTML = `<iframe src="${toEmbedUrl(video.url_youtube || video.url_video, 0)}" title="Video detallado" allow="encrypted-media" allowfullscreen></iframe>`;
        });
      }
      modal.querySelector('#openCharacterProfile')?.addEventListener('click', () => {
        modal.remove();
        openCharacterProfile(personaje);
      });
      modal.querySelector('[data-open-actor]')?.addEventListener('click', (event) => {
        const actorName = event.currentTarget.dataset.openActor;
        if (!actorName) return;
        modal.remove();
        state.actorFocus = actorName;
        state.actorLetterFilter = getActorInitialLetter(actorName);
        state.actorLetterFilterExpanded = true;
        state.actorDetailsExpanded = true;
        changeView('actores');
      });
      modal.querySelector('#editVideo')?.addEventListener('click', () => {
        const personajeNuevo = prompt('Nombre del personaje:', video.personaje || '');
        if (personajeNuevo === null) return;
        const actorNuevo = prompt('Actor de doblaje:', video.actor_de_doblaje || '');
        if (actorNuevo === null) return;
        const rarezaNueva = prompt('Rareza (Común, Raro, Épico, Legendario):', video.rareza || 'Común');
        if (rarezaNueva === null) return;
        const universosNuevos = prompt('Universos asociados (separados por coma):', getVideoUniverses(video).join(', '));
        if (universosNuevos === null) return;
        video.personaje = personajeNuevo.trim() || 'Sin personaje';
        video.actor_de_doblaje = actorNuevo.trim() || 'Sin actor';
        video.rareza = rarezasPermitidas(rarezaNueva);
        video.universo = universosNuevos.split(',').map(u => u.trim()).filter(Boolean);
        if (hasGreetingVideo(video)) unlockBlockedCharacterForActor(video.actor_de_doblaje, video.personaje);
        else blockCharacterForActor(video.actor_de_doblaje, video.personaje);
        ensureUniverseNodes();
        saveVideos();
        renderMapView();
        renderUniverseView();
        modal.remove();
      });
      modal.querySelector('#deleteVideo')?.addEventListener('click', () => {
        if (!confirm('¿Eliminar este personaje/video de la colección?')) return;
        const index = VIDEOS.findIndex(item => item.id === video.id);
        if (index >= 0) VIDEOS.splice(index, 1);
        saveVideos();
        renderMapView();
        renderUniverseView();
        modal.remove();
      });
    }

    function openCharacterProfile(characterName) {
      // SOLUCIÓN: Ahora siempre redirigimos al perfil súper detallado del Índice
      state.indiceCharacterFocus = characterName;
      changeView('indice');
    }

    function normalizeVideoUniverseDatabase() {
      const universeListByCharacter = new Map();
      VIDEOS.forEach((video) => {
        const normalizedCharacter = normalizeName(video.personaje || '');
        if (!normalizedCharacter) return;
        if (!universeListByCharacter.has(normalizedCharacter)) universeListByCharacter.set(normalizedCharacter, []);
        universeListByCharacter.get(normalizedCharacter).push(...getVideoUniverses(video));
      });
      universeListByCharacter.forEach((rawUniverses, normalizedCharacter) => {
        const canonicalUniverses = normalizeUniverseList(rawUniverses, { fallbackToUnassigned: true });
        VIDEOS.forEach((video) => {
          if (normalizeName(video.personaje || '') !== normalizedCharacter) return;
          video.universo = [...canonicalUniverses];
        });
      });
    }

    function refreshDependentViews() {
      normalizeVideoUniverseDatabase();
      syncCollectionModelWithVideos(collectionModel);
      renderMapView();
      renderActoresView();
      if (state.universe) renderUniverseView();
    }

    function setCharacterProfileFeedback(message, type = 'success') {
      const feedback = document.getElementById('characterProfileFeedback');
      if (!feedback) return;
      feedback.textContent = message || '';
      feedback.style.color = type === 'error' ? '#ffb6b6' : '#9ff7c8';
    }

    function getCharacterProfileData(characterId) {
      const characterName = getCharacterNameById(characterId);
      const characterEntries = VIDEOS.filter(v => getCharacterIdByName(v.personaje || '') === characterId);
      const videos = characterEntries.filter(v => hasGreetingVideo(v));
      const actors = [...new Set(characterEntries.map(v => String(v.actor_de_doblaje || 'Sin actor').trim()).filter(Boolean))];
      const universes = [...new Set(characterEntries.flatMap(v => getVideoUniverses(v).map(name => String(name || '').trim())).filter(Boolean))];
      const blockedActors = Object.entries(state.blockedCharactersByActor)
        .filter(([actorName, blocked]) => blocked.some(item => normalizeName(item) === normalizeName(characterName))
          && !characterEntries.some(v => normalizeName(v.actor_de_doblaje) === normalizeName(actorName) && hasGreetingVideo(v)))
        .map(([actorName]) => actorName);
      const status = blockedActors.length ? 'Bloqueado' : 'Desbloqueado';
      return { characterName, videos, actors, universes, blockedActors, status };
    }

    function renderCharacterProfile(characterId) {
      const { characterName, videos, actors, universes, blockedActors, status } = getCharacterProfileData(characterId);
      if (!characterName) {
        viewCharacterProfile.innerHTML = `
          <section class="mock-shell">
            <h2>Perfil no disponible</h2>
            <p class="muted">El personaje solicitado no existe.</p>
            <button id="backFromCharacterMissing" class="neon-btn">Volver al mapa</button>
          </section>
        `;
        document.getElementById('backFromCharacterMissing')?.addEventListener('click', () => changeView('map'));
        return;
      }
      viewCharacterProfile.innerHTML = `
        <section class="hud-panel holo-card profile-layout">
          <div class="actions">
            <button id="backFromCharacterProfile" class="neon-btn">← Volver</button>
          </div>
          <h2 class="section-title detail-character">${characterName}</h2>
          <p class="profile-status">Estado:
            <span class="status-pill ${status === 'Desbloqueado' ? 'unlocked' : 'locked'}">${status}</span>
          </p>
          ${blockedActors.length ? `<p class="section-note">Bloqueado para: ${blockedActors.join(', ')}.</p>` : ''}
          <p id="characterProfileFeedback" class="inline-feedback" aria-live="polite"></p>
          <article class="profile-section">
            <h4>Actores asociados (${actors.length})</h4>
            <ul class="detail-list detail-list-soft">${actors.map(name => `<li>${name}</li>`).join('') || '<li>Sin actores asociados.</li>'}</ul>
            <div class="actions"><button id="addActorToCharacter" class="neon-btn">Agregar actor</button></div>
          </article>
          <article class="profile-section">
            <h4>Universos asociados (${universes.length})</h4>
            <ul class="detail-list detail-list-soft">${universes.map(name => `<li>${name}</li>`).join('') || '<li>Sin universos asociados.</li>'}</ul>
            <div class="actions"><button id="addUniverseToCharacter" class="neon-btn">Agregar universo</button></div>
          </article>
          <article class="profile-section">
            <h4>Videos asociados (${videos.length})</h4>
            <ul class="detail-list detail-list-soft">
              ${videos.map(item => `<li>${item.titulo || 'Sin título'} · ${item.actor_de_doblaje || 'Sin actor'} · ${(getVideoUniverses(item).join(', ') || 'Sin universo')}</li>`).join('') || '<li>Sin videos asociados.</li>'}
            </ul>
          </article>
        </section>
      `;
      document.getElementById('backFromCharacterProfile')?.addEventListener('click', () => changeView(state.universe ? 'universe' : 'map'));
      document.getElementById('addActorToCharacter')?.addEventListener('click', () => {
        const inputName = prompt(`Nombre del actor para ${characterName}:`, '');
        if (inputName === null) return;
        const actorName = inputName.trim();
        if (!actorName) return setCharacterProfileFeedback('Debes ingresar un nombre de actor.', 'error');
        const normalizedActor = normalizeName(actorName);
        const existingActor = [...new Set(VIDEOS.map(v => String(v.actor_de_doblaje || '').trim()).filter(Boolean))]
          .find(name => normalizeName(name) === normalizedActor);
        if (videos.some(v => normalizeName(v.actor_de_doblaje) === normalizedActor)) {
          return setCharacterProfileFeedback('Ese actor ya está vinculado al personaje.', 'error');
        }
        const canonicalActor = existingActor || actorName;
        const baseUniverses = universes.length ? universes : ['Sin universo'];
        VIDEOS.push({
          id: `video-${Date.now()}`,
          titulo: `Vínculo actor-personaje: ${characterName}`,
          universo: [...baseUniverses],
          personaje: characterName,
          actor_de_doblaje: canonicalActor,
          url_youtube: '',
          rareza: 'Común',
          thumbnail: createPlaceholderCover(baseUniverses[0] || 'Universo')
        });
        blockCharacterForActor(canonicalActor, characterName);
        ensureUniverseNodes();
        saveVideos();
        refreshDependentViews();
        renderCharacterProfile(characterId);
        setCharacterProfileFeedback(existingActor ? 'Actor existente vinculado correctamente.' : 'Actor creado y vinculado correctamente.');
      });
      document.getElementById('addUniverseToCharacter')?.addEventListener('click', () => {
        const inputName = prompt(`Nombre del universo para ${characterName}:`, '');
        if (inputName === null) return;
        const universeName = inputName.trim();
        if (!universeName) return setCharacterProfileFeedback('Debes ingresar un nombre de universo.', 'error');
        const normalizedUniverse = normalizeName(universeName);
        const existingUniverse = [...new Set([...Object.keys(groupByUniverse()), ...state.universeNodes.map(node => node.name)])]
          .find(name => normalizeName(name) === normalizedUniverse);
        if (universes.some(name => normalizeName(name) === normalizedUniverse)) {
          return setCharacterProfileFeedback('Ese universo ya está vinculado al personaje.', 'error');
        }
        const canonicalUniverse = existingUniverse || universeName;
        if (videos.length) {
          videos.forEach((item) => {
            const list = getVideoUniverses(item);
            if (!list.some(name => normalizeName(name) === normalizedUniverse)) item.universo = [...list, canonicalUniverse];
          });
        } else {
          VIDEOS.push({
            id: `video-${Date.now()}`,
            titulo: `Nuevo registro de ${characterName}`,
            universo: [canonicalUniverse],
            personaje: characterName,
            actor_de_doblaje: 'Sin actor',
            url_youtube: '',
            rareza: 'Común',
            thumbnail: createPlaceholderCover(canonicalUniverse)
          });
        }
        ensureUniverseNodes();
        saveVideos();
        refreshDependentViews();
        renderCharacterProfile(characterId);
        setCharacterProfileFeedback(existingUniverse ? 'Universo existente vinculado correctamente.' : 'Universo creado y vinculado correctamente.');
      });
    }

    function rarezasPermitidas(value) {
      const allowed = ['Común', 'Raro', 'Épico', 'Legendario'];
      return allowed.includes(value) ? value : 'Común';
    }

    function renderAchievementsView() {
      const universeMap = groupByUniverse();
      const universeCompleted = Object.values(universeMap).some(data => data.totalCharacters >= 3);
      const tenSameUniverse = Object.values(universeMap).some(data => data.totalCharacters >= 10);
      const fiveLegendary = VIDEOS.filter(v => v.rareza === 'Legendario').length >= 5;

      const achievements = [
        {
          title: 'Primer universo completado',
          description: 'Tener al menos 3 personajes distintos en un universo.',
          unlocked: universeCompleted
        },
        {
          title: '10 personajes de un mismo universo',
          description: 'Completa 10 personajes únicos dentro de un universo.',
          unlocked: tenSameUniverse
        },
        {
          title: '5 videos legendarios',
          description: 'Consigue 5 videos con rareza Legendario.',
          unlocked: fiveLegendary
        }
      ];

      viewAchievements.innerHTML = `
        <div class="hud-panel achievements">
          ${achievements.map(a => `
            <article class="achievement stat-card ${a.unlocked ? 'done' : ''}">
              <h3 class="section-title">${a.unlocked ? '✅' : '🔒'} ${a.title}</h3>
              <p class="section-subtitle">${a.description}</p>
              <p>${a.unlocked ? 'Desbloqueado' : 'Pendiente'}</p>
            </article>
          `).join('')}
        </div>
      `;
    }

    function openCharacterProfileFromCollectionCard(characterId) {
      const entry = getGlobalCharacterCollection().find(item => item.id === characterId);
      if (!entry || !entry.unlocked) return;
      const profileId = getCharacterIdByName(entry.name);
      if (!profileId) return;
      state.characterProfileId = profileId;
      changeView('characterProfile');
    }

    function renderCollectionView() {
      const characters = getGlobalCharacterCollection();
      const total = characters.length;
      const unlocked = characters.filter(item => item.unlocked).length;
      const percent = total ? Math.round((unlocked / total) * 100) : 0;
      const previousSnapshot = state.collectionUnlockSnapshot || {};
      const nextSnapshot = {};

      viewCollection.innerHTML = `
        <section class="collection-view">
          <article class="hud-panel collection-kpi">
            <div class="collection-kpi-head">
              <h2 class="section-title">Colección global de personajes</h2>
              <span class="collection-kpi-value">${unlocked}/${total}</span>
            </div>
            <p class="section-subtitle">Progreso desbloqueado: ${percent}%</p>
            <div class="collection-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
              <div class="collection-progress-bar" style="--collection-progress:${percent}%;"></div>
            </div>
          </article>

          <section class="grid">
            ${characters.map((character) => {
              nextSnapshot[character.id] = Boolean(character.unlocked);
              const hadPreviousState = Object.prototype.hasOwnProperty.call(previousSnapshot, character.id);
              const newlyUnlocked = hadPreviousState && !previousSnapshot[character.id] && character.unlocked;
              if (!character.unlocked) {
                const rarity = character.rareza || 'Bloqueado';
                const rarityClassName = rarityClass(rarity);
                return `
                  <article class="collection-card collection-character-card locked ${rarityClassName}" style="--rarity-color:${rarityColorValue(rarity)};">
                    <div class="locked-silhouette" aria-hidden="true">
                      <div>👤</div>
                      <div class="lock-icon">🔒 BLOQUEADO</div>
                    </div>
                    <div class="card-footer">
                      <p class="meta character-name">${character.name}</p>
                      <p class="meta"><small>Rareza:</small><span class="badge ${rarityClassName}">${rarity}</span></p>
                      <p class="meta"><small>Estado:</small>🔒 Bloqueado</p>
                      <p class="meta"><small>Actor:</small>${character.actor || 'Sin actor'}</p>
                    </div>
                  </article>
                `;
              }
              return `
                <article
                  class="collection-card collection-character-card unlocked ${newlyUnlocked ? 'is-newly-unlocked' : ''}"
                  data-character-id="${character.id}"
                >
                  <div class="card-media">
                    <img class="video-thumb" src="${character.thumbnail || createPlaceholderCover(character.name)}" alt="Miniatura de ${character.name}" loading="lazy">
                    <p class="card-title">${character.name}</p>
                  </div>
                  <div class="card-footer">
                    <p class="meta"><small>Actor:</small>${character.actor || 'Sin actor'}</p>
                    <p class="meta"><small>Universos:</small>${character.universes.length ? character.universes.join(', ') : 'Sin universo'}</p>
                    <span class="badge ${rarityClass(character.rareza || 'Común')}">${character.rareza || 'Común'}</span>
                  </div>
                </article>
              `;
            }).join('') || '<p class="muted">No hay personajes cargados todavía.</p>'}
          </section>
        </section>
      `;

      state.collectionUnlockSnapshot = nextSnapshot;
      viewCollection.querySelectorAll('[data-character-id]').forEach((card) => {
        card.addEventListener('click', () => {
          const { characterId } = card.dataset;
          if (!characterId) return;
          openCharacterProfileFromCollectionCard(characterId);
        });
      });
    }

    function getCharacterActorsForIndice(characterName) {
      const normalizedCharacter = normalizeName(characterName);
      const videosByCharacter = VIDEOS.filter(video => normalizeName(video.personaje || 'Sin personaje') === normalizedCharacter);
      const unlockedByActor = new Map();
      videosByCharacter.forEach((video) => {
        const actorName = String(video.actor_de_doblaje || 'Sin actor').trim() || 'Sin actor';
        if (!unlockedByActor.has(actorName) && hasGreetingVideo(video)) unlockedByActor.set(actorName, video);
      });
      const blockedActors = Object.entries(state.blockedCharactersByActor)
        .filter(([actorName, blockedList]) => blockedList.some(item => normalizeName(item) === normalizedCharacter)
          && !unlockedByActor.has(actorName))
        .map(([actorName]) => actorName);
      return { unlockedByActor, blockedActors };
    }

    function updateCharacterMetadata(currentCharacterName, {
      nextCharacterName,
      nextRarity,
      nextUniverses
    }) {
      const previousNormalized = normalizeName(currentCharacterName || '');
      const canonicalName = String(nextCharacterName || '').trim();
      const canonicalRarity = rarezasPermitidas(nextRarity || 'Común');
      const canonicalUniverses = normalizeUniverseList(nextUniverses, { fallbackToUnassigned: true });

      VIDEOS.forEach((video) => {
        if (normalizeName(video.personaje || '') !== previousNormalized) return;
        video.personaje = canonicalName;
        video.rareza = canonicalRarity;
        video.universo = [...canonicalUniverses];
      });

      Object.keys(state.blockedCharactersByActor).forEach((actorKey) => {
        const list = Array.isArray(state.blockedCharactersByActor[actorKey]) ? state.blockedCharactersByActor[actorKey] : [];
        state.blockedCharactersByActor[actorKey] = list.map((name) =>
          normalizeName(name) === previousNormalized ? canonicalName : name
        );
      });

      return { canonicalName, canonicalRarity, canonicalUniverses };
    }

    function getCharactersForIndice(searchTerm = '') {
      const grouped = new Map();
      (collectionModel.characters || []).forEach((character) => {
        const characterName = String(character?.name || 'Sin personaje').trim() || 'Sin personaje';
        const normalized = normalizeName(characterName);
        if (!grouped.has(normalized)) {
          grouped.set(normalized, {
            name: characterName,
            versions: [],
            coverVideo: null
          });
        }
      });
      VIDEOS.forEach((video) => {
        const characterName = String(video.personaje || 'Sin personaje').trim() || 'Sin personaje';
        const normalized = normalizeName(characterName);
        if (!grouped.has(normalized)) {
          grouped.set(normalized, {
            name: characterName,
            versions: [],
            coverVideo: null
          });
        }
        const record = grouped.get(normalized);
        record.versions.push(video);
        if (!record.coverVideo && hasGreetingVideo(video)) record.coverVideo = video;
      });
      Object.entries(state.blockedCharactersByActor || {}).forEach(([actorName, blockedList]) => {
        (Array.isArray(blockedList) ? blockedList : []).forEach((characterName) => {
          const cleanName = String(characterName || '').trim();
          if (!cleanName) return;
          const normalized = normalizeName(cleanName);
          if (!grouped.has(normalized)) {
            grouped.set(normalized, {
              name: cleanName,
              versions: [],
              coverVideo: null
            });
          }
          const record = grouped.get(normalized);
          if (!record.versions.some(item => normalizeName(item.actor_de_doblaje || '') === normalizeName(actorName))) {
            record.versions.push({
              id: `blocked-${cssSafe(actorName)}-${cssSafe(cleanName)}`,
              personaje: cleanName,
              actor_de_doblaje: actorName,
              url_youtube: '',
              universo: []
            });
          }
        });
      });
      const normalizedSearch = normalizeName(searchTerm || '');
      const selectedUniverse = normalizeUniverseName(state.indiceFilters?.universe || 'todos');
      const selectedActor = normalizeName(state.indiceFilters?.actor || 'todos');
      return [...grouped.values()]
        .map((item) => {
          const { unlockedByActor, blockedActors } = getCharacterActorsForIndice(item.name);
          const universes = getCharacterUniverseList(item.name, { fallbackToUnassigned: false });
          const unlockedVersion = item.versions.find(video => hasGreetingVideo(video));
          const sourceVersion = unlockedVersion || item.versions[0] || null;
          const rarity = rarezasPermitidas(sourceVersion?.rareza || 'Común');
          return {
            ...item,
            actorCount: unlockedByActor.size + blockedActors.length,
            actors: [...new Set([...unlockedByActor.keys(), ...blockedActors])],
            universes,
            rareza: rarity,
            unlocked: Boolean(unlockedVersion || item.coverVideo)
          };
        })
        .filter(item => !normalizedSearch || normalizeName(item.name).includes(normalizedSearch))
        .filter((item) => {
          if (selectedUniverse !== 'todos') {
            const matchesUniverse = item.universes.some((name) => normalizeUniverseName(name) === selectedUniverse);
            if (!matchesUniverse) return false;
          }
          if (selectedActor !== 'todos') {
            const matchesActor = item.actors.some((name) => normalizeName(name) === selectedActor);
            if (!matchesActor) return false;
          }
          return true;
        })
        .sort((a, b) => {
          const rarityDiff = rarityRank(b.rareza) - rarityRank(a.rareza);
          if (rarityDiff !== 0) return rarityDiff;
          return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
        });
    }

    function getUniverseOptionsForCharacterForm() {
      const universeByNormalizedName = new Map();
      const unassignedKey = normalizeUniverseName(SPECIAL_UNASSIGNED_UNIVERSE);
      const registerUniverse = (rawName, { preferExisting = false } = {}) => {
        const canonicalName = String(rawName || '').trim();
        const normalizedName = normalizeUniverseName(canonicalName);
        if (!normalizedName || normalizedName === unassignedKey) return;
        if (!universeByNormalizedName.has(normalizedName) || preferExisting) {
          universeByNormalizedName.set(normalizedName, canonicalName);
        }
      };
      state.universeNodes.forEach((node) => registerUniverse(node.name, { preferExisting: true }));
      Object.values(groupByUniverse()).forEach((universe) => registerUniverse(universe.name));
      return [...universeByNormalizedName.values()]
        .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    }

    function getUniverseOptionsForIndiceFilters() {
      const universeByNormalizedName = new Map();
      const registerUniverse = (rawName) => {
        const canonicalName = String(rawName || '').trim();
        const normalizedName = normalizeUniverseName(canonicalName);
        if (!normalizedName) return;
        if (!universeByNormalizedName.has(normalizedName)) universeByNormalizedName.set(normalizedName, canonicalName);
      };
      state.universeNodes.forEach((node) => registerUniverse(node.name));
      Object.values(groupByUniverse()).forEach((universe) => registerUniverse(universe.name));
      VIDEOS.forEach((video) => getVideoUniverses(video).forEach(registerUniverse));
      return [...universeByNormalizedName.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    }

    function getActorOptionsForIndiceFilters() {
      const actorByNormalizedName = new Map();
      const registerActor = (rawName) => {
        const canonicalName = String(rawName || '').trim();
        const normalizedName = normalizeName(canonicalName);
        if (!normalizedName) return;
        if (!actorByNormalizedName.has(normalizedName)) actorByNormalizedName.set(normalizedName, canonicalName);
      };
      (collectionModel.actors || []).forEach((actor) => registerActor(actor.name));
      VIDEOS.forEach((video) => registerActor(video.actor_de_doblaje));
      Object.keys(state.blockedCharactersByActor || {}).forEach(registerActor);
      return [...actorByNormalizedName.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    }

    function addDraftActorFromInput(rawName) {
      const actorName = String(rawName || '').trim();
      if (!actorName) return false;
      const normalized = normalizeName(actorName);
      const existingDraft = state.draftCharacterActors.some(item => normalizeName(item) === normalized);
      if (existingDraft) return false;
      const existingActor = (collectionModel.actors || []).find(item => normalizeName(item.name) === normalized);
      const canonicalName = existingActor?.name || actorName;
      state.draftCharacterActors = [...state.draftCharacterActors, canonicalName];
      return true;
    }

    function submitNewCharacterForm(formEl) {
      const formData = new FormData(formEl);
      const characterName = String(formData.get('characterName') || '').trim();
      const selectedUniverse = String(formData.get('characterUniverse') || '').trim();
      const rarity = String(formData.get('characterRarity') || 'Común');
      const rawActors = String(formData.get('characterActors') || '').trim();
      const actorsInput = rawActors ? rawActors.split(',').map(s=>s.trim()).filter(Boolean) : [];

      if (!characterName) {
        state.draftCharacterFeedback = 'Debes ingresar el nombre del personaje.';
        renderIndiceView();
        return;
      }
      if (!selectedUniverse) {
        state.draftCharacterFeedback = 'Debes seleccionar un universo existente.';
        renderIndiceView();
        return;
      }
      const normalizedCharacter = normalizeName(characterName);
      const alreadyExists = VIDEOS.some(video => normalizeName(video.personaje || '') === normalizedCharacter);
      if (alreadyExists) {
        state.draftCharacterFeedback = 'Ese personaje ya existe en el índice.';
        renderIndiceView();
        return;
      }

      if (actorsInput.length === 0) {
        // Personaje sin actor
        VIDEOS.push({
          id: `video-${Date.now()}`,
          titulo: `Registro de ${characterName}`,
          universo: [selectedUniverse],
          personaje: characterName,
          actor_de_doblaje: 'Sin actor',
          url_youtube: '',
          rareza: rarity,
          thumbnail: createPlaceholderCover(characterName)
        });
      } else {
        // Personaje con actores, autovincular
        actorsInput.forEach((actorName, idx) => {
          VIDEOS.push({
            id: `video-${Date.now()}-${idx}`,
            titulo: `Registro de ${characterName}`,
            universo: [selectedUniverse],
            personaje: characterName,
            actor_de_doblaje: actorName,
            url_youtube: '',
            rareza: rarity,
            thumbnail: createPlaceholderCover(characterName)
          });
          blockCharacterForActor(actorName, characterName);
        });
      }

      ensureUniverseNodes();
      saveVideos();
      refreshDependentViews();

      state.showAddCharacterForm = false;
      state.draftCharacterFeedback = 'Personaje agregado correctamente.';
      renderIndiceView();
      if (state.actorFocus) renderActoresView();
    }

    function clearIndicePreviewTimer() {
      if (state.indicePreviewTimer) {
        clearTimeout(state.indicePreviewTimer);
        state.indicePreviewTimer = null;
      }
    }

    function removeIndicePreviewPopover() {
      const popover = document.getElementById('characterPreviewPopover');
      if (popover) popover.remove();
    }

    function showIndiceCharacterPreview(item, anchorEl) {
      if (!item || !anchorEl) return;
      removeIndicePreviewPopover();
      const popover = document.createElement('article');
      popover.id = 'characterPreviewPopover';
      popover.className = 'character-preview-popover';
      popover.dataset.locked = item.unlocked ? 'false' : 'true';
      popover.style.setProperty('--preview-rarity', rarityColorValue(item.rareza || 'Común'));
      popover.innerHTML = `
        <img src="${item.coverVideo ? getVideoThumbnail(item.coverVideo) : createPlaceholderCover(item.name)}" alt="Vista previa de ${item.name}">
        <div class="preview-meta">
          <h3>${item.name}</h3>
          <p><span class="preview-field-label">Rareza</span><span class="preview-field-value">${item.rareza || 'Común'}</span></p>
          <p><span class="preview-field-label">Actores</span><span class="preview-field-value">${item.actors.length ? item.actors.join(', ') : 'Sin actores asociados'}</span></p>
          <p><span class="preview-field-label">Universos</span><span class="preview-field-value">${item.universes.length ? item.universes.join(', ') : 'Sin universo'}</span></p>
        </div>
      `;
      document.body.appendChild(popover);
      const rect = anchorEl.getBoundingClientRect();
      const margin = 12;
      const spacing = 12;
      const rightPreferred = rect.right + spacing;
      const rightFits = rightPreferred + popover.offsetWidth <= window.innerWidth - margin;
      const leftPreferred = rect.left - popover.offsetWidth - spacing;
      const left = rightFits
        ? rightPreferred
        : Math.max(margin, Math.min(leftPreferred, window.innerWidth - popover.offsetWidth - margin));
      const topPreferred = rect.top - 8;
      const bottomPreferred = rect.bottom - popover.offsetHeight;
      const top = Math.max(
        margin,
        Math.min(
          topPreferred,
          window.innerHeight - popover.offsetHeight - margin,
          Math.max(margin, bottomPreferred)
        )
      );
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
    }

    function bindIndiceCharacterCardPreview(cards, indexItems) {
      cards.forEach((card) => {
        const characterName = card.dataset.openCharacter;
        if (!characterName) return;
        const item = indexItems.find(entry => entry.name === characterName);
        if (!item) return;

        card.addEventListener('mouseenter', () => {
          clearIndicePreviewTimer();
          state.indicePreviewCharacter = characterName;
          state.indicePreviewAnchor = card;
          state.indicePreviewTimer = setTimeout(() => {
            if (state.indicePreviewCharacter !== characterName || state.indicePreviewAnchor !== card) return;
            showIndiceCharacterPreview(item, card);
          }, 3000);
        });

        card.addEventListener('mouseleave', () => {
          if (state.indicePreviewCharacter === characterName) {
            state.indicePreviewCharacter = '';
            state.indicePreviewAnchor = null;
          }
          clearIndicePreviewTimer();
          removeIndicePreviewPopover();
        });

        card.addEventListener('blur', () => {
          clearIndicePreviewTimer();
          removeIndicePreviewPopover();
        });
      });
    }

    function getCharacterLockedAvatarUrl(characterName) {
      const normalized = normalizeName(characterName || '');
      if (!normalized) return '';
      const withCustomAvatar = VIDEOS.find((video) =>
        normalizeName(video.personaje || '') === normalized && String(video.locked_avatar_url || '').trim()
      );
      return withCustomAvatar ? String(withCustomAvatar.locked_avatar_url || '').trim() : '';
    }

    function setCharacterLockedAvatarUrl(characterName, rawUrl) {
      const normalized = normalizeName(characterName || '');
      if (!normalized) return false;
      const cleanUrl = String(rawUrl || '').trim();
      const characterEntries = VIDEOS.filter(video => normalizeName(video.personaje || '') === normalized);
      if (!characterEntries.length) return false;
      characterEntries.forEach((video) => {
        if (cleanUrl) video.locked_avatar_url = cleanUrl;
        else delete video.locked_avatar_url;
      });
      return true;
    }

    function renderCharacterGalleryCard(item, options = {}) {
      const cardName = String(item?.name || item?.characterName || '').trim();
      if (!cardName) return '';
      const locked = Boolean(options.locked ?? !item?.unlocked);
      const rarityValue = String(item?.rareza || item?.coverVideo?.rareza || 'Común');
      const rarityData = rarityValue.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const glowColor = rarityColorValue(rarityValue);
      const floatDelay = options.floatDelay || `-${(Math.random() * 2.6).toFixed(2)}s`;

      const renderMedia = () => {
        const customAvatarUrl = getCharacterLockedAvatarUrl(cardName);
        if (!locked) {
          if (item?.coverVideo && hasGreetingVideo(item.coverVideo)) {
            return `<img class="character-gallery-media character-gallery-media--image" src="${getVideoThumbnail(item.coverVideo)}" alt="Portada de YouTube de ${cardName}" loading="lazy">`;
          }
          return `<div class="character-gallery-media character-gallery-media--avatar-fallback" role="img" aria-label="Avatar por defecto de ${cardName}"></div>`;
        }
        return `
          <div
            class="character-gallery-media profile-avatar--locked indice-card-locked-avatar ${customAvatarUrl ? 'has-custom-image' : ''}"
            role="img"
            aria-label="Avatar bloqueado de ${cardName}"
            ${customAvatarUrl ? `style="background-image: url('${customAvatarUrl.replace(/'/g, '%27')}')"` : ''}
          >
            <span class="profile-avatar-lock-label">
              <span class="lock-icon">🔒</span>
              ${customAvatarUrl ? '' : '<span class="lock-text">Bloqueado</span>'}
            </span>
          </div>
        `;
      };

      return `
        <button
          type="button"
          class="character-gallery-card"
          data-open-character="${cardName}"
          data-rarity="${rarityData}"
          data-locked="${locked ? 'true' : 'false'}"
          style="--rarity-glow:${glowColor}; --float-delay:${floatDelay};"
        >
          ${renderMedia()}
          <div class="meta">
            <h3>${cardName}</h3>
          </div>
        </button>
      `;
    }

    function renderIndiceView() {
      clearIndicePreviewTimer();
      removeIndicePreviewPopover();
      const focusedCharacter = state.indiceCharacterFocus;
      
      if (focusedCharacter) {
        // Datos del personaje
        const normalizedCharacter = normalizeName(focusedCharacter);
        const charVideos = VIDEOS.filter(v => normalizeName(v.personaje || '') === normalizedCharacter);
        const rareza = charVideos[0]?.rareza || 'Común';
        const universos = getCharacterUniverseList(focusedCharacter, { fallbackToUnassigned: false });
        const realVideos = charVideos.filter(v => hasGreetingVideo(v));
        
        const { unlockedByActor, blockedActors } = getCharacterActorsForIndice(focusedCharacter);
        const unlockedActors = [...unlockedByActor.entries()]
          .map(([actorName, video]) => ({ actorName, video, locked: false, isUnlocked: hasGreetingVideo(video) }));
        const lockedActors = blockedActors.map(actorName => ({ actorName, video: null, locked: true, isUnlocked: false }));
        const actorCards = [...unlockedActors, ...lockedActors]
          .map(item => ({ ...item, isUnlocked: !item.locked && hasGreetingVideo(item.video) }))
          .sort((a, b) => a.actorName.localeCompare(b.actorName, 'es', { sensitivity: 'base' }));

        const isCharacterLocked = realVideos.length === 0;
        const customLockedAvatarUrl = getCharacterLockedAvatarUrl(focusedCharacter);
        // Imagen de portada (si no hay videos reproducibles se muestra estado bloqueado)
        const profileImage = !isCharacterLocked && unlockedActors.length > 0 && unlockedActors[0].video
          ? getVideoThumbnail(unlockedActors[0].video)
          : createPlaceholderCover(focusedCharacter);
        const profileAvatarMarkup = isCharacterLocked
          ? `
              <div
                class="profile-avatar--locked ${customLockedAvatarUrl ? 'has-custom-image' : ''}"
                role="img"
                aria-label="Avatar de ${focusedCharacter} en estado bloqueado, sin videos reproducibles disponibles"
                ${customLockedAvatarUrl ? `style="background-image: url('${customLockedAvatarUrl.replace(/'/g, '%27')}')"` : ''}
              >
                <span class="profile-avatar-lock-label">
                  <span class="lock-icon">🔒</span>
                  ${customLockedAvatarUrl ? '' : '<span class="lock-text">Bloqueado</span>'}
                </span>
              </div>
            `
          : `<img src="${profileImage}" class="profile-avatar" alt="Avatar de ${focusedCharacter}" loading="lazy">`;

        viewIndice.innerHTML = `
          <section class="hud-panel holo-card profile-layout character-profile-layout">
            <div class="actions character-profile-nav">
              <button id="backToCharacterGallery" class="neon-btn toon-btn">← Volver al Índice</button>
            </div>
            
            <div class="universe-hero character-hero">
              ${profileAvatarMarkup}
              <div class="character-hero__content">
                <h2 class="section-title detail-character character-hero__title">${focusedCharacter}</h2>
                <div class="detail-meta character-hero__badges">
                  <span class="badge character-hero__badge ${rarityClass(rareza)}">🌟 ${rareza}</span>
                  ${universos.map((universe) => {
                    const universeLabel = String(universe || '').trim() || SPECIAL_UNASSIGNED_UNIVERSE;
                    return `<button type="button" class="badge character-hero__badge character-hero__badge--universes character-hero__badge--universe-red character-hero__badge--universe-link" data-open-universe-profile="${escapeHtml(universeLabel)}" aria-label="Abrir perfil del universo ${escapeHtml(universeLabel)}"><span class="character-hero__universe-name">${escapeHtml(universeLabel)}</span></button>`;
                  }).join('') || `<span class="badge character-hero__badge character-hero__badge--universes character-hero__badge--universe-red"><span class="character-hero__universe-name">${SPECIAL_UNASSIGNED_UNIVERSE}</span></span>`}
                </div>
              </div>
              <div class="character-hero__actions">
                <button id="editCharacterBtn" class="neon-btn neon-btn--primary toon-btn toon-btn--primary character-hero__icon-btn" title="Editar personaje" aria-label="Editar personaje">✏️</button>
                <button id="deleteCharacterBtn" class="neon-btn toon-btn toon-btn--danger character-hero__icon-btn" title="Eliminar personaje" aria-label="Eliminar personaje">🗑️</button>
              </div>
            </div>

            <p id="indiceCharacterFeedback" class="inline-feedback character-feedback" aria-live="polite"></p>
            <form id="characterInlineEditForm" class="character-inline-editor" ${state.showCharacterInlineEdit ? '' : 'hidden'}>
              <div class="character-inline-editor__grid">
                <label>Nombre del personaje
                  <input type="text" name="characterName" value="${focusedCharacter}">
                </label>
                <label>Rareza
                  <input type="text" name="characterRarity" value="${rareza}" placeholder="Común, Raro, Épico o Legendario">
                </label>
                <label>Actores (separados por coma)
                  <input type="text" name="characterActors" value="${actorCards.map(a => a.actorName).join(', ')}">
                </label>
                <label>Universos (separados por coma)
                  <input type="text" name="characterUniverses" value="${universos.join(', ')}">
                </label>
                <label>Avatar bloqueado (URL opcional)
                  <input type="url" name="lockedAvatarUrl" value="${customLockedAvatarUrl}" placeholder="https://...">
                </label>
              </div>
              <div class="character-inline-editor__actions">
                <button type="submit" class="neon-btn neon-btn--primary">Guardar cambios</button>
                <button type="button" id="cancelCharacterEdit" class="neon-btn">Cancelar</button>
              </div>
            </form>
            <section id="characterInlineDeletePanel" class="character-inline-editor" ${state.showCharacterInlineDelete ? '' : 'hidden'}>
              <p style="margin:0;">¿Seguro que deseas eliminar al personaje <strong>${focusedCharacter}</strong> por completo?</p>
              <div class="character-inline-editor__actions">
                <button type="button" id="confirmDeleteCharacterBtn" class="neon-btn toon-btn toon-btn--danger">Confirmar eliminación</button>
                <button type="button" id="cancelDeleteCharacterBtn" class="neon-btn">Cancelar</button>
              </div>
            </section>

            <article class="profile-section">
              <h4 class="profile-section__title">🎙️ Actores de doblaje asignados (${actorCards.length})</h4>
              <section class="character-actors-grid">
                ${actorCards.map(item => !item.isUnlocked
                  ? `
                    <article class="character-actor-card locked" aria-disabled="true">
                      <div class="locked-mic" role="img" aria-label="Actor bloqueado">🎙️</div>
                      <div class="meta">
                        <h3><button type="button" class="actor-name-btn" data-open-actor-profile="${item.actorName}" aria-label="Abrir perfil de ${item.actorName}">${item.actorName}</button> <button type="button" class="neon-btn actor-add-btn" data-add-greeting-actor="${item.actorName}" aria-label="Agregar video para ${item.actorName}">+</button></h3>
                        <p class="locked-note">Bloqueado</p>
                      </div>
                    </article>
                  `
                  : `
                    <article class="character-actor-card unlocked">
                      <img src="${getActorCardThumbnail(item.video, item.actorName)}" alt="Miniatura de ${item.actorName} como ${focusedCharacter}" loading="lazy" onerror="this.onerror=null;this.src='${createPlaceholderCover(item.actorName)}';this.dataset.fallback='true';">
                      <div class="meta">
                        <h3><button type="button" class="actor-name-btn" data-open-actor-profile="${item.actorName}" aria-label="Abrir perfil de ${item.actorName}">${item.actorName}</button> <button type="button" class="neon-btn add-greeting-btn actor-add-btn" data-add-greeting-actor="${item.actorName}" aria-label="Agregar otro video para ${item.actorName}">+</button></h3>
                        <p><button type="button" class="neon-btn" data-open-video="${item.video.id}">▶ Ver video</button></p>
                      </div>
                    </article>
                  `).join('') || '<p class="muted">No hay actores asociados para este personaje.</p>'}
              </section>
            </article>

          </section>
        `;

        document.getElementById('backToCharacterGallery')?.addEventListener('click', () => {
          state.indiceCharacterFocus = null;
          renderIndiceView();
        });

        // EDICIÓN AVANZADA
        document.getElementById('editCharacterBtn')?.addEventListener('click', () => {
          state.showCharacterInlineEdit = !state.showCharacterInlineEdit;
          state.showCharacterInlineDelete = false;
          renderIndiceView();
        });

        document.getElementById('cancelCharacterEdit')?.addEventListener('click', () => {
          state.showCharacterInlineEdit = false;
          renderIndiceView();
        });

        document.getElementById('characterInlineEditForm')?.addEventListener('submit', (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const newName = String(formData.get('characterName') || '').trim();
          const newRarity = String(formData.get('characterRarity') || '').trim();
          const newActorsRaw = String(formData.get('characterActors') || '');
          const newUniversesRaw = String(formData.get('characterUniverses') || '');
          const lockedAvatarUrl = String(formData.get('lockedAvatarUrl') || '').trim();
          if (!newName || !newRarity) return;

          const newActorsList = [...new Set(newActorsRaw.split(',').map(s => s.trim()).filter(Boolean))];
          const parsedUniverses = newUniversesRaw.split(',').map(s => s.trim()).filter(Boolean);
          const {
            canonicalName: cleanName,
            canonicalRarity: cleanRarity,
            canonicalUniverses: newUniversesList
          } = updateCharacterMetadata(focusedCharacter, {
            nextCharacterName: newName,
            nextRarity: newRarity,
            nextUniverses: parsedUniverses
          });

          // 3. Procesar Actores agregados y eliminados
          const oldActorsList = [...new Set(actorCards.map(a => a.actorName))];
          const oldActorsNormalized = new Map(oldActorsList.map((name) => [normalizeName(name), name]));
          const newActorsNormalized = new Map(newActorsList.map((name) => [normalizeName(name), name]));
          const addedActors = [...newActorsNormalized.entries()]
            .filter(([normalized]) => !oldActorsNormalized.has(normalized))
            .map(([, canonical]) => canonical);
          const removedActors = [...oldActorsNormalized.entries()]
            .filter(([normalized]) => !newActorsNormalized.has(normalized))
            .map(([, canonical]) => canonical);

          // Eliminar videos/placeholders de los actores que quitó
          for (let i = VIDEOS.length - 1; i >= 0; i--) {
              if (normalizeName(VIDEOS[i].personaje) === normalizeName(cleanName)) {
                  if (removedActors.some((actor) => normalizeName(actor) === normalizeName(VIDEOS[i].actor_de_doblaje))) {
                      VIDEOS.splice(i, 1);
                  }
              }
          }
          // Limpiarlos de la lista de bloqueados
          removedActors.forEach(actor => {
              if (state.blockedCharactersByActor[actor]) {
                  state.blockedCharactersByActor[actor] = state.blockedCharactersByActor[actor].filter(c => normalizeName(c) !== normalizeName(cleanName));
              }
          });

          // Agregar placeholders para actores nuevos
          addedActors.forEach(actor => {
              VIDEOS.push({
                  id: `video-${Date.now()}-${Math.random()}`,
                  titulo: `Registro de ${cleanName}`,
                  universo: [...newUniversesList],
                  personaje: cleanName,
                  actor_de_doblaje: actor,
                  url_youtube: '',
                  rareza: cleanRarity,
                  thumbnail: createPlaceholderCover(cleanName),
                  locked_avatar_url: lockedAvatarUrl
              });
              blockCharacterForActor(actor, cleanName);
          });

          setCharacterLockedAvatarUrl(cleanName, lockedAvatarUrl);
          state.showCharacterInlineEdit = false;
          state.indiceCharacterFocus = cleanName;
          saveBlockedCharacters();
          saveVideos();
          refreshDependentViews();
          renderIndiceView();
        });

        // ELIMINAR PERSONAJE
        document.getElementById('deleteCharacterBtn')?.addEventListener('click', () => {
          state.showCharacterInlineDelete = !state.showCharacterInlineDelete;
          state.showCharacterInlineEdit = false;
          renderIndiceView();
        });

        document.getElementById('cancelDeleteCharacterBtn')?.addEventListener('click', () => {
          state.showCharacterInlineDelete = false;
          renderIndiceView();
        });

        document.getElementById('confirmDeleteCharacterBtn')?.addEventListener('click', () => {
          for (let i = VIDEOS.length - 1; i >= 0; i--) {
              if (normalizeName(VIDEOS[i].personaje) === normalizeName(focusedCharacter)) {
                  VIDEOS.splice(i, 1);
              }
          }
          Object.keys(state.blockedCharactersByActor).forEach(actorKey => {
              state.blockedCharactersByActor[actorKey] = state.blockedCharactersByActor[actorKey].filter(c => normalizeName(c) !== normalizeName(focusedCharacter));
          });
          state.showCharacterInlineDelete = false;
          state.showCharacterInlineEdit = false;
          state.indiceCharacterFocus = null;
          saveBlockedCharacters();
          saveVideos();
          refreshDependentViews();
          renderIndiceView();
        });

        // Eventos para abrir videos
        viewIndice.querySelectorAll('[data-open-video], [data-open-video-modal]').forEach((btn) => {
          btn.addEventListener('click', () => {
             const videoId = btn.dataset.openVideo || btn.dataset.openVideoModal;
             openVideoDetail(videoId);
          });
        });
        viewIndice.querySelectorAll('[data-open-actor-profile]').forEach((btn) => {
          btn.addEventListener('click', (event) => {
            event.stopPropagation();
            const actorName = btn.dataset.openActorProfile;
            if (!actorName) return;
            state.actorFocus = actorName;
            state.actorLetterFilter = getActorInitialLetter(actorName);
            state.actorLetterFilterExpanded = true;
            state.actorDetailsExpanded = true;
            changeView('actores');
          });
        });
        viewIndice.querySelectorAll('[data-open-universe-profile]').forEach((btn) => {
          btn.addEventListener('click', (event) => {
            event.stopPropagation();
            const universeName = String(btn.dataset.openUniverseProfile || '').trim();
            if (!universeName) return;
            state.universe = universeName;
            state.filters = { personaje: 'todos', actor: 'todos', rareza: 'todos' };
            changeView('universe');
          });
        });

        // Evento para cargar un nuevo saludo
        viewIndice.querySelectorAll('[data-add-greeting-actor]').forEach((btn) => {
          btn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const actorName = btn.dataset.addGreetingActor;
            if (!actorName) return;
            const feedback = document.getElementById('indiceCharacterFeedback');
            const rawUrl = prompt(`URL de YouTube para ${focusedCharacter} (${actorName}):`, '');
            if (rawUrl === null) return;
            const normalizedUrl = normalizeYoutubeUrl(rawUrl.trim());
            if (!normalizedUrl) {
              if (feedback) {
                feedback.style.color = '#ffb6b6';
                feedback.textContent = 'La URL de YouTube no es válida.';
              }
              return;
            }
            if (feedback) {
              feedback.style.color = '#9ff7c8';
              feedback.textContent = 'Guardando saludo...';
            }
            const metadata = await fetchYoutubeMetadata(normalizedUrl);
            const targetUniverse = universos[0] || 'Sin universo';
            VIDEOS.push({
              id: `video-${Date.now()}`,
              titulo: metadata.title || `Saludo de ${focusedCharacter}`,
              universo: [targetUniverse], // Se ata al primer universo que tenga designado
              personaje: focusedCharacter,
              actor_de_doblaje: actorName,
              url_youtube: normalizedUrl,
              rareza: rareza, // Mantiene la rareza configurada
              thumbnail: metadata.thumbnail || ''
            });
            unlockBlockedCharacterForActor(actorName, focusedCharacter);
            saveVideos();
            refreshDependentViews();
            if (feedback) {
              feedback.style.color = '#9ff7c8';
              feedback.textContent = '¡Saludo agregado con éxito!';
            }
            renderIndiceView();
          });
        });
        return;
      }

      // ----------------------------------------------------------------------------------
      // VISTA DE GALERÍA DE ÍNDICE (Cuando no hay personaje enfocado)
      // ----------------------------------------------------------------------------------
      const indexItems = getCharactersForIndice(state.indiceSearch);
      const universeOptions = getUniverseOptionsForCharacterForm();
      const indexUniverseFilters = getUniverseOptionsForIndiceFilters();
      const indexActorFilters = getActorOptionsForIndiceFilters();
      const rarityGroupLabels = {
        Legendario: 'Legendarios',
        'Épico': 'Épicos',
        Raro: 'Raros',
        'Común': 'Comunes'
      };
      const groupedIndexItems = indexItems.reduce((acc, item) => {
        const rarity = item.rareza || 'Común';
        if (!acc.has(rarity)) acc.set(rarity, []);
        acc.get(rarity).push(item);
        return acc;
      }, new Map());
      const rarityRenderOrder = ['Legendario', 'Épico', 'Raro', 'Común'];
      viewIndice.innerHTML = `
        <section class="mock-shell">
          <div class="indice-toolbar">
            <h2 style="margin:0;">Índice de Personajes</h2>
            <button id="toggleAddCharacterForm" class="neon-btn">${state.showAddCharacterForm ? 'Cerrar formulario' : 'Agregar personaje'}</button>
          </div>
          ${state.showAddCharacterForm ? `
            <form id="addCharacterForm" class="add-character-form">
              <label>Nombre del personaje
                <input type="text" name="characterName" placeholder="Ej. Homero Simpson" required>
              </label>
              <label>Rareza
                <select name="characterRarity">
                  <option value="Común">Común</option>
                  <option value="Raro">Raro</option>
                  <option value="Épico">Épico</option>
                  <option value="Legendario">Legendario</option>
                </select>
              </label>
              <label>Actores de doblaje (opcional, separados por coma)
                <input type="text" name="characterActors" placeholder="Ej. Humberto Vélez, Víctor Manuel Espinoza">
              </label>
              <label>Universo (Obligatorio)
                <select name="characterUniverse" required ${universeOptions.length ? '' : 'disabled'}>
                  <option value="">Selecciona un universo</option>
                  ${universeOptions.map((name) => `<option value="${name}">${name}</option>`).join('')}
                </select>
              </label>
              <p id="addCharacterFeedback" class="inline-feedback" aria-live="polite">${state.draftCharacterFeedback || ''}</p>
              <div class="actions">
                <button type="submit" class="neon-btn neon-btn--primary" ${universeOptions.length ? '' : 'disabled'}>Guardar personaje</button>
              </div>
              ${universeOptions.length ? '' : '<p class="muted">Primero debes crear al menos un universo para poder agregar personajes.</p>'}
            </form>
          ` : ''}
          <div class="indice-filter-row">
            <input id="indiceSearchInput" type="search" value="${state.indiceSearch}" placeholder="Filtrar personaje..." aria-label="Buscar personaje en índice">
            <select id="indiceUniverseFilter" aria-label="Filtrar por universo">
              <option value="todos">Todos los universos</option>
              ${indexUniverseFilters.map((name) => `<option value="${name}" ${state.indiceFilters.universe === name ? 'selected' : ''}>${name}</option>`).join('')}
            </select>
            <select id="indiceActorFilter" aria-label="Filtrar por actor">
              <option value="todos">Todos los actores</option>
              ${indexActorFilters.map((name) => `<option value="${name}" ${state.indiceFilters.actor === name ? 'selected' : ''}>${name}</option>`).join('')}
            </select>
          </div>
          <section class="characters-gallery">
            ${indexItems.length
              ? rarityRenderOrder
                .filter((rarity) => groupedIndexItems.has(rarity))
                .map((rarity) => `
                  <button
                    type="button"
                    class="indice-group-divider indice-group-toggle"
                    data-toggle-rarity="${rarity}"
                    aria-expanded="${state.indiceCollapsedRarities.has(rarity) ? 'false' : 'true'}"
                  >
                    <span>${rarityGroupLabels[rarity] || rarity}</span>
                    <span class="indice-group-toggle-icon">${state.indiceCollapsedRarities.has(rarity) ? '▸' : '▾'}</span>
                  </button>
                  ${state.indiceCollapsedRarities.has(rarity)
                    ? ''
                    : groupedIndexItems.get(rarity).map(item => renderCharacterGalleryCard(item, { locked: !item.unlocked })).join('')}
                `).join('')
              : '<p class="muted">No hay personajes cargados.</p>'}
          </section>
        </section>
      `;
      document.getElementById('indiceSearchInput')?.addEventListener('input', (event) => {
        state.indiceSearch = event.target.value;
        renderIndiceView();
      });
      document.getElementById('indiceUniverseFilter')?.addEventListener('change', (event) => {
        state.indiceFilters.universe = event.target.value;
        renderIndiceView();
      });
      document.getElementById('indiceActorFilter')?.addEventListener('change', (event) => {
        state.indiceFilters.actor = event.target.value;
        renderIndiceView();
      });
      document.getElementById('toggleAddCharacterForm')?.addEventListener('click', () => {
        state.showAddCharacterForm = !state.showAddCharacterForm;
        state.draftCharacterFeedback = '';
        renderIndiceView();
      });
      viewIndice.querySelectorAll('[data-toggle-rarity]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const rarity = btn.dataset.toggleRarity;
          if (!rarity) return;
          if (state.indiceCollapsedRarities.has(rarity)) {
            state.indiceCollapsedRarities.delete(rarity);
          } else {
            state.indiceCollapsedRarities.add(rarity);
          }
          renderIndiceView();
        });
      });
      document.getElementById('addCharacterForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        submitNewCharacterForm(event.currentTarget);
      });
      viewIndice.querySelectorAll('[data-open-character]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.indiceCharacterFocus = btn.dataset.openCharacter;
          renderIndiceView();
        });
      });
      bindIndiceCharacterCardPreview(viewIndice.querySelectorAll('.character-gallery-card'), indexItems);
    }

    function shuffleVideos(videos) {
      const copy = [...videos];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    function ensureMarathonState() {
      const marathon = state.marathon;
      const automaticQueue = VIDEOS.filter((video) => hasGreetingVideo(video));
      const byUniverse = groupByUniverse();
      const universePlaylists = Object.entries(byUniverse)
        .map(([key, data]) => ({
          id: `universe:${key}`,
          name: data.name || key || 'Universo',
          videos: VIDEOS.filter((video) => (
            hasGreetingVideo(video) &&
            getVideoUniverses(video).some((name) => normalizeUniverseName(name) === key)
          ))
        }))
        .filter((playlist) => playlist.videos.length);
      const customPlaylists = getCustomMarathonPlaylists().map((playlist) => ({
        ...playlist,
        videos: playlist.videoIds
          .map((videoId) => VIDEOS.find((video) => String(video.id) === videoId))
          .filter((video) => video && hasGreetingVideo(video))
      })).filter((playlist) => playlist.videos.length);
      marathon.playlists = [
        {
          id: 'auto',
          name: 'Automática',
          videos: [...automaticQueue]
        },
        ...universePlaylists,
        ...customPlaylists
      ];
      if (!marathon.playlists.some((playlist) => playlist.id === marathon.activePlaylistId)) {
        marathon.activePlaylistId = marathon.playlists[0]?.id || 'auto';
      }
      const activePlaylist = marathon.playlists.find((playlist) => playlist.id === marathon.activePlaylistId) || marathon.playlists[0] || { videos: [] };
      const fallbackQueue = marathon.shuffleEnabled ? shuffleVideos(activePlaylist.videos) : [...activePlaylist.videos];
      const currentVideoId = marathon.queue[marathon.position]?.id;
      marathon.queue = fallbackQueue;
      const nextIndex = marathon.queue.findIndex((video) => video.id === currentVideoId);
      marathon.position = nextIndex >= 0 ? nextIndex : 0;
      if (!marathon.queue.length) {
        marathon.position = 0;
        marathon.isPlaying = false;
      }
      saveMarathonState();
    }

    function renderCustomMarathonPlaylistsList() {
      const customPlaylists = state.marathon.playlists.filter((playlist) => playlist.source === 'custom');
      if (!customPlaylists.length) {
        return '<p class="marathon-empty">Todavía no creaste playlists personalizadas.</p>';
      }
      return `
        <ul class="marathon-custom-list">
          ${customPlaylists.map((playlist) => `
            <li>
              <button
                type="button"
                class="marathon-custom-card ${playlist.id === state.marathon.activePlaylistId ? 'active' : ''}"
                data-custom-playlist-id="${playlist.id}">
                ${playlist.cover ? `<img src="${escapeHtml(playlist.cover)}" alt="Portada de ${escapeHtml(playlist.name)}" loading="lazy">` : '<span class="marathon-custom-placeholder">Sin portada</span>'}
                <strong>${escapeHtml(playlist.name)}</strong>
              </button>
            </li>
          `).join('')}
        </ul>
      `;
    }

    function openMarathonCreateModal() {
      state.marathon.createModalOpen = true;
      renderMaratonView();
    }

    function closeMarathonCreateModal() {
      state.marathon.createModalOpen = false;
      renderMaratonView();
    }

    async function submitMarathonCreateForm(form) {
      const formData = new FormData(form);
      const name = String(formData.get('playlistName') || '').trim();
      if (!name) throw new Error('El nombre de la playlist es obligatorio.');
      const selectedVideos = formData.getAll('playlistVideos').map((id) => String(id || '').trim()).filter(Boolean);
      if (!selectedVideos.length) throw new Error('Seleccioná al menos un video.');
      const coverMode = String(formData.get('coverMode') || 'url');
      const coverUrl = String(formData.get('playlistCoverUrl') || '').trim();
      const coverFile = formData.get('playlistCoverFile');
      let cover = '';
      if (coverMode === 'file' && coverFile instanceof File && coverFile.size > 0) {
        if (!coverFile.type.startsWith('image/')) throw new Error('El archivo seleccionado no es una imagen.');
        if (coverFile.size > MAX_LOCAL_IMAGE_BYTES) throw new Error('La imagen supera el límite de 2MB.');
        cover = await fileToDataUrl(coverFile);
      } else if (coverMode === 'url' && coverUrl) {
        cover = validateCoverUrl(coverUrl);
      }

      const playlist = {
        id: `custom:${Date.now()}`,
        name,
        videoIds: [...new Set(selectedVideos)],
        cover,
        source: 'custom'
      };
      state.marathon.playlists = [...state.marathon.playlists, playlist];
      state.marathon.activePlaylistId = playlist.id;
      state.marathon.position = 0;
      state.marathon.isPlaying = false;
      state.marathon.createModalOpen = false;
      saveMarathonState();
      renderMaratonView();
    }

    function renderMaratonView() {
      // 1. Poblado dinámico de la lista automática con todos los videos válidos
      const allVideoIds = VIDEOS
        .filter(v => hasGreetingVideo(v))
        .map(v => v.id);
      
      AUTO_MARATHON_PLAYLIST.videoIds = allVideoIds;

      // 2. Sincronización del estado de maratón
      ensureMarathonState();
      
      const marathon = state.marathon;
      const selectableVideos = VIDEOS.filter((video) => hasGreetingVideo(video));
      const playlistOptions = marathon.playlists.map((playlist) => (
        `<option value="${playlist.id}" ${playlist.id === marathon.activePlaylistId ? 'selected' : ''}>${playlist.name}</option>`
      )).join('');

      viewMaraton.innerHTML = `
        <section class="marathon">
          <header class="marathon-header">
            <h2 class="marathon-title">MARATÓN</h2>
            <button id="addMarathonBtn" class="neon-btn toon-btn toon-btn--primary" type="button">Agregar maratón</button>
          </header>
          <div class="marathon-layout">
            <div class="marathon-main">
              <label class="marathon-playlist-label" for="marathonPlaylistSelect">Playlist activa</label>
              <select id="marathonPlaylistSelect" aria-label="Playlist activa de maratón">
                ${playlistOptions}
              </select>
              <div class="marathon-player-shell">
                ${marathon.queue.length
                  ? '<div id="marathonPlayerMount"></div>'
                  : '<div class="marathon-empty">No hay videos disponibles para esta playlist.</div>'}
              </div>
              <div class="marathon-controls">
                <button id="marathonPlayPauseBtn" class="neon-btn" type="button">${marathon.isPlaying ? 'Pausa' : 'Play'}</button>
                <button id="marathonPrevBtn" class="neon-btn" type="button">Anterior</button>
                <button id="marathonNextBtn" class="neon-btn" type="button">Siguiente</button>
                <button id="marathonShuffleBtn" class="neon-btn" type="button">Reproducir aleatoriamente ${marathon.shuffleEnabled ? '✓' : ''}</button>
              </div>
              <section class="marathon-custom-section">
                <p class="marathon-playlist-label">Playlists personalizadas</p>
                ${renderCustomMarathonPlaylistsList()}
              </section>
            </div>
            <aside class="marathon-side">
              <p class="marathon-playlist-label">Videos de playlist</p>
              <ul class="marathon-list">
                ${marathon.queue.map((video, index) => `
                  <li>
                    <button type="button" class="marathon-item-btn ${index === marathon.position ? 'active' : ''}" data-marathon-index="${index}">
                      <strong>${escapeHtml(video.titulo || video.personaje || `Video ${index + 1}`)}</strong>
                      <small>${escapeHtml(video.personaje || 'Sin personaje')} · ${escapeHtml(video.actor_de_doblaje || 'Sin actor')}</small>
                    </button>
                  </li>
                `).join('') || '<li class="marathon-empty">La playlist está vacía.</li>'}
              </ul>
            </aside>
          </div>
          ${marathon.createModalOpen ? `
            <div class="detail-modal">
              <div class="detail-content marathon-create-modal">
                <h3>Crear playlist personalizada</h3>
                <form id="marathonCreateForm" class="marathon-create-form">
                  <label>
                    Nombre de playlist *
                    <input type="text" name="playlistName" required maxlength="80" placeholder="Ej: Favoritos de Sonic">
                  </label>
                  <fieldset>
                    <legend>Videos</legend>
                    <div class="marathon-video-picker">
                      ${selectableVideos.map((video) => `
                        <label>
                          <input type="checkbox" name="playlistVideos" value="${escapeHtml(video.id)}">
                          <span>${escapeHtml(video.titulo || video.personaje || 'Video')}</span>
                          <small>${escapeHtml(video.personaje || 'Sin personaje')} · ${escapeHtml(video.actor_de_doblaje || 'Sin actor')}</small>
                        </label>
                      `).join('') || '<p class="muted">No hay videos disponibles para agregar.</p>'}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>Portada (opcional)</legend>
                    <div class="cover-mode" role="group" aria-label="Selector de portada">
                      <button type="button" data-marathon-cover-mode="url" class="active">URL</button>
                      <button type="button" data-marathon-cover-mode="file">Archivo</button>
                    </div>
                    <input type="hidden" name="coverMode" value="url" id="marathonCoverModeInput">
                    <div data-marathon-cover-input="url">
                      <input type="url" name="playlistCoverUrl" placeholder="https://...">
                    </div>
                    <div data-marathon-cover-input="file" hidden>
                      <input type="file" name="playlistCoverFile" accept="image/*">
                    </div>
                  </fieldset>
                  <p id="marathonCreateFeedback" class="muted"></p>
                  <div class="actions">
                    <button type="button" id="cancelMarathonCreateBtn" class="neon-btn">Cancelar</button>
                    <button type="submit" class="neon-btn toon-btn toon-btn--primary">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          ` : ''}
        </section>
      `;

      // Listeners
      document.getElementById('addMarathonBtn')?.addEventListener('click', () => {
        openMarathonCreateModal();
      });

      document.getElementById('marathonPlaylistSelect')?.addEventListener('change', (event) => {
        state.marathon.activePlaylistId = event.target.value;
        state.marathon.position = 0;
        renderMaratonView(); // Re-renderizamos para que se actualice la queue
      });

      document.getElementById('marathonPlayPauseBtn')?.addEventListener('click', () => {
        if (!state.marathon.queue.length) return;
        state.marathon.isPlaying = !state.marathon.isPlaying;
        setMarathonPlaybackState(state.marathon.isPlaying);
        updateMarathonUiState();
      });

      document.getElementById('marathonPrevBtn')?.addEventListener('click', () => {
        if (!state.marathon.queue.length) return;
        state.marathon.position = state.marathon.position > 0
          ? state.marathon.position - 1
          : state.marathon.queue.length - 1;
        state.marathon.isPlaying = true;
        loadMarathonVideoAtCurrentPosition();
      });

      document.getElementById('marathonNextBtn')?.addEventListener('click', () => {
        if (!state.marathon.queue.length) return;
        advanceMarathonQueue();
      });

      document.getElementById('marathonShuffleBtn')?.addEventListener('click', () => {
        state.marathon.shuffleEnabled = !state.marathon.shuffleEnabled;
        state.marathon.position = 0;
        renderMaratonView();
      });

      viewMaraton.querySelectorAll('[data-custom-playlist-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const playlistId = button.dataset.customPlaylistId;
          if (!playlistId) return;
          state.marathon.activePlaylistId = playlistId;
          state.marathon.position = 0;
          renderMaratonView();
        });
      });

      viewMaraton.querySelectorAll('[data-marathon-index]').forEach((button) => {
        button.addEventListener('click', () => {
          const selectedIndex = Number(button.dataset.marathonIndex);
          if (!Number.isFinite(selectedIndex) || selectedIndex < 0 || selectedIndex >= state.marathon.queue.length) return;
          state.marathon.position = selectedIndex;
          loadMarathonVideoAtCurrentPosition();
        });
      });

      document.getElementById('cancelMarathonCreateBtn')?.addEventListener('click', () => {
        closeMarathonCreateModal();
      });

      const marathonCreateForm = document.getElementById('marathonCreateForm');
      const marathonCreateFeedback = document.getElementById('marathonCreateFeedback');
      marathonCreateForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!marathonCreateFeedback) return;
        marathonCreateFeedback.textContent = '';
        try {
          await submitMarathonCreateForm(event.currentTarget);
        } catch (err) {
          marathonCreateFeedback.textContent = err.message || 'No se pudo crear la playlist.';
        }
      });

      marathonCreateForm?.querySelectorAll('[data-marathon-cover-mode]').forEach((modeBtn) => {
        modeBtn.addEventListener('click', () => {
          const mode = modeBtn.dataset.marathonCoverMode || 'url';
          marathonCreateForm.querySelectorAll('[data-marathon-cover-mode]').forEach(btn => btn.classList.toggle('active', btn === modeBtn));
          marathonCreateForm.querySelectorAll('[data-marathon-cover-input]').forEach(group => {
            group.hidden = group.dataset.marathonCoverInput !== mode;
          });
          const modeInput = marathonCreateForm.querySelector('#marathonCoverModeInput');
          if (modeInput) modeInput.value = mode;
        });
      });

      ensureMarathonQueuePlayer().then(() => {
        loadMarathonVideoAtCurrentPosition({ forceLoad: true });
      });
    }

    function renderRarezasView() {
      const levels = [
        ['Común', 'Estabilidad base'],
        ['Raro', 'Carga amplificada'],
        ['Épico', 'Pulso de energía avanzada'],
        ['Legendario', 'Núcleo máximo']
      ];
      viewRarezas.innerHTML = `
        <section class="mock-shell toon-panel">
          <h2 class="toon-title">Rarezas por nivel de energía</h2>
          <div class="mock-row">
            ${levels.map(([name, desc]) => `<article class="mock-box toon-panel"><h3 class="toon-title"><span class="toon-chip">${name}</span></h3><p class="muted">${desc}</p></article>`).join('')}
          </div>
        </section>
      `;
    }

    function renderActoresView() {
      const getActorTierFlags = (entries, unlockedVideosCount) => {
        const totalEntries = entries.length;
        const completion = totalEntries ? Math.round((unlockedVideosCount / totalEntries) * 100) : 0;
        return {
          platinado: totalEntries > 0 && completion === 100,
          consagrado: completion >= 70,
          destacado: completion >= 40,
          desbloqueado: unlockedVideosCount > 0
        };
      };

      const ensureBlockedPlaceholderForActorCharacter = (actorName, characterName) => {
        const cleanActorName = String(actorName || '').trim();
        const cleanCharacterName = String(characterName || '').trim();
        if (!cleanActorName || !cleanCharacterName) return;
        const normalizedCharacterName = normalizeName(cleanCharacterName);
        const canonicalCharacterName = VIDEOS.find((video) => normalizeName(video.personaje || '') === normalizedCharacterName)?.personaje || cleanCharacterName;

        const alreadyRegisteredBlockedVideo = VIDEOS.some((video) => (
          normalizeName(video.actor_de_doblaje || '') === normalizeName(cleanActorName)
          && normalizeName(video.personaje || '') === normalizedCharacterName
          && !hasGreetingVideo(video)
        ));
        if (alreadyRegisteredBlockedVideo) return;

        const existingCharacterEntries = VIDEOS.filter((video) => normalizeName(video.personaje || '') === normalizedCharacterName);
        const inheritedUniverses = [...new Set(existingCharacterEntries.flatMap(item => getVideoUniverses(item)).filter(Boolean))];
        const inheritedRarity = rarezasPermitidas(existingCharacterEntries.find(item => item.rareza)?.rareza || 'Común');
        VIDEOS.push({
          id: `video-bloqueado-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          titulo: `Registro bloqueado de ${canonicalCharacterName}`,
          universo: inheritedUniverses.length ? inheritedUniverses : [SPECIAL_UNASSIGNED_UNIVERSE],
          personaje: canonicalCharacterName,
          actor_de_doblaje: cleanActorName,
          url_youtube: '',
          rareza: inheritedRarity,
          thumbnail: createPlaceholderCover(canonicalCharacterName)
        });
      };

      const actorNameByNormalized = new Map();
      const registerActorName = (rawName) => {
        const cleanName = String(rawName || '').trim();
        if (!cleanName) return;
        const normalizedName = normalizeName(cleanName);
        if (!normalizedName || normalizedName === normalizeName('Sin actor')) return;
        if (!actorNameByNormalized.has(normalizedName)) {
          actorNameByNormalized.set(normalizedName, cleanName);
        }
      };
      collectionModel.actors.forEach((item) => registerActorName(item?.name));
      VIDEOS.forEach((video) => registerActorName(video?.actor_de_doblaje));
      const actors = [...actorNameByNormalized.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
      const actorSummaries = actors.map((name) => {
        const entries = VIDEOS.filter(v => (v.actor_de_doblaje || 'Sin actor') === name);
        const blockedCharacters = state.blockedCharactersByActor[name] || [];
        const unlockedCharactersSet = new Set(
          entries
            .filter(v => hasGreetingVideo(v))
            .map(v => String(v.personaje || 'Sin personaje').trim())
            .filter(Boolean)
        );
        const totalCharactersSet = new Set([
          ...entries.map(v => String(v.personaje || 'Sin personaje').trim()).filter(Boolean),
          ...blockedCharacters.map((characterName) => String(characterName || '').trim()).filter(Boolean)
        ]);
        const unlockedCharactersCount = unlockedCharactersSet.size;
        const totalCharactersCount = totalCharactersSet.size;
        const tier = getActorTier(unlockedCharactersCount);
        const completionRatio = totalCharactersCount > 0 ? (unlockedCharactersCount / totalCharactersCount) : 0;
        const completionPercent = Math.round(completionRatio * 100);
        return {
          name,
          entries,
          videosCount: entries.filter(v => hasGreetingVideo(v)).length,
          charactersCount: totalCharactersCount,
          unlockedCharactersCount,
          totalCharactersCount,
          tier,
          tierLabel: tier.label,
          tierRank: tier.rank,
          initial: getActorInitialLetter(name),
          completionPercent,
          completionLabel: `${unlockedCharactersCount}/${totalCharactersCount || 0}`,
          tierFlags: {
            platinado: tier.key === 'platinado',
            consagrado: tier.key === 'consagrado',
            destacado: tier.key === 'destacado',
            desbloqueado: tier.key === 'desbloqueado',
            bloqueado: tier.key === 'bloqueado'
          }
        };
      }).sort((a, b) => (
        b.tierRank - a.tierRank
        || b.unlockedCharactersCount - a.unlockedCharactersCount
        || b.charactersCount - a.charactersCount
        || b.videosCount - a.videosCount
        || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      ));

      const activeTierFilterKeys = Object.entries(state.actorTierFilters || {})
        .filter(([, isActive]) => Boolean(isActive))
        .map(([key]) => key);
      const actorSummariesByTier = activeTierFilterKeys.length
        ? actorSummaries.filter((summary) => activeTierFilterKeys.some((tierKey) => summary.tierFlags?.[tierKey]))
        : actorSummaries;

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const activeLetterFilter = state.actorLetterFilter || '';
      const filteredActorSummaries = actorSummariesByTier.filter((item) => (
        !activeLetterFilter || item.initial === activeLetterFilter
      ));
      const visibleActorNames = filteredActorSummaries.map((item) => item.name);
      if (state.actorFocus && !visibleActorNames.includes(state.actorFocus)) {
        state.actorFocus = null;
        state.actorDetailsExpanded = false;
      }
      const actor = state.actorFocus || null;
      if (!actor || !state.actorDetailsExpanded) {
        state.actorRenameModalOpen = false;
      }
      const actorEntries = VIDEOS.filter(v => (v.actor_de_doblaje || 'Sin actor') === actor);
      const actorVideos = actorEntries.filter(v => hasGreetingVideo(v));
      const actorCharacters = [...new Set(actorEntries.map(v => v.personaje || 'Sin personaje'))];
      const blockedCharacters = state.blockedCharactersByActor[actor] || [];
      const blockedOnly = blockedCharacters.filter(name => !actorCharacters.includes(name));
      const actorCharacterCards = [
        ...actorCharacters.map((characterName) => {
          const relatedVideo = actorVideos.find(item => (item.personaje || 'Sin personaje') === characterName && hasGreetingVideo(item));
          const rarity = highestRarityForActorCharacter(actor, characterName);
          return {
            characterName,
            unlocked: Boolean(relatedVideo),
            rarity,
            rarityClassName: rarityClass(rarity),
            video: relatedVideo || null
          };
        }),
        ...blockedOnly.map((characterName) => {
          const normalizedCharacter = normalizeName(characterName);
          const matchingEntries = VIDEOS.filter((video) => normalizeName(video.personaje || 'Sin personaje') === normalizedCharacter);
          const rarityRankBest = matchingEntries.reduce((bestRank, video) => {
            const videoRank = rarityRank(rarezasPermitidas(video.rareza || 'Común'));
            return videoRank > bestRank ? videoRank : bestRank;
          }, -1);
          const rarityLabels = ['Común', 'Raro', 'Épico', 'Legendario'];
          const rarity = rarityRankBest >= 0 ? rarezasPermitidas(rarityLabels[rarityRankBest]) : 'Común';
          return {
            characterName,
            unlocked: false,
            rarity,
            rarityClassName: rarityClass(rarity),
            video: null
          };
        })
      ];
      const actorInlineDetailMarkup = actor && state.actorDetailsExpanded ? `
        <article class="mock-box actor-detail-grid mock-gap-md toon-panel actor-inline-detail">
          <div>
            <div class="actor-detail-header">
              <h3 class="actor-detail-title"><span class="actor-detail-name">${actor}</span></h3>
              <div class="actions actor-detail-actions">
              <button id="editActorBtn" class="neon-btn actor-icon-btn actor-icon-btn--edit" aria-label="Editar actor" title="Editar actor">✏️</button>
              <button id="deleteActorBtn" class="neon-btn actor-icon-btn actor-icon-btn--danger" aria-label="Eliminar actor" title="Eliminar actor">🗑️</button>
              </div>
            </div>
            <p class="muted">Personajes: ${actorCharacters.length} · Videos: ${actorVideos.length}</p>
            <div class="actions actor-blocked-actions">
              <input id="blockedCharacterInput" type="text" placeholder="Agregar personaje bloqueado">
              <button id="addBlockedCharacter" class="neon-btn">Agregar bloqueado</button>
            </div>
            <ul class="actor-character-list">
              ${actorCharacterCards.map((item) => `
                <li class="actor-character-item">
                  ${renderCharacterGalleryCard({
                    name: item.characterName,
                    coverVideo: item.video || null,
                    rareza: item.rarity,
                    unlocked: item.unlocked
                  }, { locked: !item.unlocked })}
                </li>
              `).join('') || '<li class="actor-character-item"><p class="muted">Sin personajes registrados.</p></li>'}
            </ul>
          </div>
        </article>
      ` : '';

      const selectedActorIndex = filteredActorSummaries.findIndex((item) => item.name === actor);
      const actorCardsPerRow = 4;
      const selectedActorRowEndIndex = selectedActorIndex >= 0
        ? Math.min((Math.floor(selectedActorIndex / actorCardsPerRow) + 1) * actorCardsPerRow, filteredActorSummaries.length) - 1
        : -1;

      viewActores.innerHTML = `
        <section class="mock-shell holo-card actors-shell">
          <div class="mock-topbar">
            <h2 class="actor-panel-title no-margin toon-title">Colección de actores</h2>
            <button id="toggleActorFormBtn" class="neon-btn actor-action-btn">Agregar Nuevo Actor</button>
          </div>
          <div class="actor-toolbar" aria-label="Controles de filtrado de actores">
            <button type="button" class="actor-filter-toggle ${state.actorLetterFilterExpanded ? 'active' : ''}" id="toggleActorAlphabetBtn" aria-expanded="${state.actorLetterFilterExpanded ? 'true' : 'false'}">A-Z</button>
            <button type="button" class="actor-filter-toggle actor-filter-toggle--flag ${state.actorTierFiltersExpanded ? 'active' : ''}" id="toggleActorTierFiltersBtn" aria-expanded="${state.actorTierFiltersExpanded ? 'true' : 'false'}">🚩</button>
          </div>
          <div class="actor-alpha-filter ${state.actorLetterFilterExpanded ? '' : 'is-hidden'}" aria-label="Filtro alfabético de actores">
            ${alphabet.map((letter) => `
              <button type="button" class="actor-alpha-btn ${activeLetterFilter === letter ? 'active' : ''}" data-actor-letter="${letter}">${letter}</button>
            `).join('')}
          </div>

          <form id="addActorForm" class="add-character-form mock-form-hidden">
            <label>Nombre del Actor
              <input type="text" name="actorName" required placeholder="Ej. Mario Castañeda">
            </label>
            <label>Personajes (opcional, separados por coma)
              <input type="text" name="actorCharacters" placeholder="Ej. Goku, Kanon de Géminis">
            </label>
            <div class="actions">
              <button type="submit" class="neon-btn neon-btn--primary">Guardar Actor</button>
            </div>
          </form>

          <div class="actor-tier-filters ${state.actorTierFiltersExpanded ? '' : 'is-hidden'}" aria-label="Filtro por estado actual de actor">
            <label class="actor-tier-filter-item">
              <input type="checkbox" data-actor-tier-filter="platinado" ${state.actorTierFilters.platinado ? 'checked' : ''}>
              <span>Platinado</span>
            </label>
            <label class="actor-tier-filter-item">
              <input type="checkbox" data-actor-tier-filter="consagrado" ${state.actorTierFilters.consagrado ? 'checked' : ''}>
              <span>Consagrado</span>
            </label>
            <label class="actor-tier-filter-item">
              <input type="checkbox" data-actor-tier-filter="destacado" ${state.actorTierFilters.destacado ? 'checked' : ''}>
              <span>Destacado</span>
            </label>
            <label class="actor-tier-filter-item">
              <input type="checkbox" data-actor-tier-filter="desbloqueado" ${state.actorTierFilters.desbloqueado ? 'checked' : ''}>
              <span>Desbloqueado</span>
            </label>
            <label class="actor-tier-filter-item">
              <input type="checkbox" data-actor-tier-filter="bloqueado" ${state.actorTierFilters.bloqueado ? 'checked' : ''}>
              <span>Bloqueado</span>
            </label>
          </div>

          <div class="actor-gallery mock-gap-lg">
            ${filteredActorSummaries.map((item, idx) => `
              <button type="button" class="actor-card actor-card--${item.tier.key} actor-card--tier-${item.tier.key} ${item.name === actor ? 'active' : ''}" data-actor-card="${item.name}">
                <h3 class="actor-card-title">${item.name}</h3>
                <p class="actor-card-tier actor-card-tier--${item.tier.key}">${item.tierLabel}</p>
                <div class="actor-card-footer">
                  <p class="actor-card-meta">Personajes: ${item.totalCharactersCount}</p>
                  <p class="actor-card-meta">Desbloqueados: ${item.unlockedCharactersCount}</p>
                </div>
                <div class="actor-card-progress" role="img" aria-label="Progreso del perfil ${item.completionLabel}">
                  <div class="actor-card-progress-track">
                    <div class="actor-card-progress-fill" style="width: ${item.completionPercent}%;"></div>
                  </div>
                  <p class="actor-card-progress-label">${item.completionLabel}</p>
                </div>
              </button>
              ${selectedActorRowEndIndex === idx ? actorInlineDetailMarkup : ''}
            `).join('') || '<p class="muted">No hay actores para este filtro.</p>'}
          </div>
          ${actor && state.actorDetailsExpanded && state.actorRenameModalOpen ? `
            <section id="actorRenameModal" class="detail-modal actor-rename-modal" role="dialog" aria-modal="true" aria-labelledby="actorRenameTitle">
              <article class="detail-content mock-box actor-rename-panel" data-actor-rename-panel>
                <h3 id="actorRenameTitle" class="no-margin toon-title">Renombrar actor</h3>
                <p class="muted no-margin">Actualiza el nombre del actor sin perder sus personajes bloqueados.</p>
                <label>Nombre del actor
                  <input id="actorRenameInput" type="text" value="${escapeHtml(actor)}" autocomplete="off">
                </label>
                <p id="actorRenameValidation" class="validation" aria-live="polite"></p>
                <div class="actions">
                  <button id="saveActorRenameBtn" class="neon-btn neon-btn--primary">Guardar</button>
                  <button id="cancelActorRenameBtn" class="neon-btn">Cancelar</button>
                </div>
              </article>
            </section>
          ` : ''}
        </section>
      `;

      // Form Toggle
      const toggleAlphabetBtn = document.getElementById('toggleActorAlphabetBtn');
      toggleAlphabetBtn?.addEventListener('click', () => {
        state.actorLetterFilterExpanded = !state.actorLetterFilterExpanded;
        renderActoresView();
      });
      const toggleTierFiltersBtn = document.getElementById('toggleActorTierFiltersBtn');
      toggleTierFiltersBtn?.addEventListener('click', () => {
        state.actorTierFiltersExpanded = !state.actorTierFiltersExpanded;
        renderActoresView();
      });

      viewActores.querySelectorAll('[data-actor-letter]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const next = btn.dataset.actorLetter || '';
          if (state.actorLetterFilter === next) return;
          state.actorLetterFilter = next;
          state.actorFocus = null;
          state.actorDetailsExpanded = false;
          renderActoresView();
        });
      });
      viewActores.querySelectorAll('[data-actor-tier-filter]').forEach((input) => {
        input.addEventListener('change', () => {
          const filterKey = input.dataset.actorTierFilter;
          if (!filterKey || !Object.prototype.hasOwnProperty.call(state.actorTierFilters, filterKey)) return;
          state.actorTierFilters[filterKey] = Boolean(input.checked);
          renderActoresView();
        });
      });

      const toggleBtn = document.getElementById('toggleActorFormBtn');
      const actorForm = document.getElementById('addActorForm');
      toggleBtn?.addEventListener('click', () => {
        const isHidden = actorForm.classList.toggle('mock-form-hidden');
        toggleBtn.textContent = isHidden ? 'Agregar Nuevo Actor' : 'Cerrar Formulario';
      });

      // Add Actor Form Submit
      actorForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const actorName = String(fd.get('actorName') || '').trim();
        const charsRaw = String(fd.get('actorCharacters') || '').trim();
        const chars = charsRaw ? charsRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
        if (!actorName) return;

        // SOLUCIÓN AL BUG DE DATOS FANTASMA:
        // Registramos al actor en el modelo interno (collectionModel) en lugar de inyectar
        // un objeto basura ('Sin personaje', 'url_youtube: ""') en el array principal VIDEOS.
        const normalizedActorName = normalizeEntityName(actorName);
        const existingActor = collectionModel.actors.find(a => normalizeEntityName(a.name) === normalizedActorName);
        if (!existingActor) {
          collectionModel.actors.push({
            id: createModelId('actor', normalizedActorName),
            name: actorName,
            characterIds: []
          });
          saveCollectionModel(); // Guardamos el modelo para que Firebase lo sincronice
        }

        chars.forEach((char) => {
          ensureBlockedPlaceholderForActorCharacter(actorName, char);
          blockCharacterForActor(actorName, char);
        });

        saveVideos();
        refreshDependentViews();
        state.actorFocus = actorName;
        state.actorLetterFilter = getActorInitialLetter(actorName);
        state.actorLetterFilterExpanded = true;
        state.actorDetailsExpanded = true;
        renderActoresView();
      });

      // Edit Actor
      document.getElementById('editActorBtn')?.addEventListener('click', () => {
        state.actorRenameModalOpen = true;
        renderActoresView();
      });
      const actorRenameModal = document.getElementById('actorRenameModal');
      const closeActorRenameModal = () => {
        state.actorRenameModalOpen = false;
        renderActoresView();
      };
      if (actorRenameModal && actor) {
        const renameInput = document.getElementById('actorRenameInput');
        const renameValidation = document.getElementById('actorRenameValidation');
        const setRenameValidation = (message = '') => {
          if (renameValidation) renameValidation.textContent = message;
        };
        const validateNewActorName = () => {
          const cleanName = String(renameInput?.value || '').trim();
          if (!cleanName) {
            setRenameValidation('El nombre no puede estar vacío.');
            return null;
          }
          if (normalizeName(cleanName) === normalizeName(actor)) {
            setRenameValidation('Ingresa un nombre diferente al actual.');
            return null;
          }
          const duplicated = actors.some((name) => (
            normalizeName(name) === normalizeName(cleanName)
            && normalizeName(name) !== normalizeName(actor)
          ));
          if (duplicated) {
            setRenameValidation('Ya existe un actor con ese nombre.');
            return null;
          }
          setRenameValidation('');
          return cleanName;
        };

        requestAnimationFrame(() => {
          renameInput?.focus();
          renameInput?.select();
        });

        renameInput?.addEventListener('input', () => {
          setRenameValidation('');
        });

        document.getElementById('cancelActorRenameBtn')?.addEventListener('click', closeActorRenameModal);
        actorRenameModal.addEventListener('click', (event) => {
          if (event.target === actorRenameModal) closeActorRenameModal();
        });
        document.getElementById('saveActorRenameBtn')?.addEventListener('click', () => {
          const cleanName = validateNewActorName();
          if (!cleanName) return;
          VIDEOS.forEach(v => {
              if (normalizeName(v.actor_de_doblaje) === normalizeName(actor)) {
                  v.actor_de_doblaje = cleanName;
              }
          });
          if (state.blockedCharactersByActor[actor]) {
              state.blockedCharactersByActor[cleanName] = state.blockedCharactersByActor[actor];
              delete state.blockedCharactersByActor[actor];
          }
          state.actorFocus = cleanName;
          state.actorLetterFilter = getActorInitialLetter(cleanName);
          state.actorLetterFilterExpanded = true;
          state.actorRenameModalOpen = false;
          saveBlockedCharacters();
          saveVideos();
          refreshDependentViews();
          renderActoresView();
        });
        actorRenameModal.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeActorRenameModal();
            return;
          }
          if (event.key !== 'Tab') return;
          const focusable = [...actorRenameModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
            .filter((element) => !element.hasAttribute('disabled'));
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
          }
        });
      }

      // Delete Actor
      document.getElementById('deleteActorBtn')?.addEventListener('click', () => {
        if(!confirm(`¿Seguro que deseas eliminar al actor "${actor}"? Los videos con saludo perderán su actor designado, y los registros bloqueados de este actor se eliminarán.`)) return;
        for (let i = VIDEOS.length - 1; i >= 0; i--) {
            if (normalizeName(VIDEOS[i].actor_de_doblaje) === normalizeName(actor)) {
                if (hasGreetingVideo(VIDEOS[i])) {
                    VIDEOS[i].actor_de_doblaje = 'Sin actor';
                } else {
                    VIDEOS.splice(i, 1);
                }
            }
        }
        delete state.blockedCharactersByActor[actor];
        state.actorFocus = null;
        state.actorDetailsExpanded = false;
        saveBlockedCharacters();
        saveVideos();
        refreshDependentViews();
        renderActoresView();
      });

      viewActores.querySelectorAll('[data-actor-card]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const clickedActor = btn.dataset.actorCard;
          if (!clickedActor) return;
          if (state.actorFocus === clickedActor && state.actorDetailsExpanded) {
            state.actorDetailsExpanded = false;
          } else {
            state.actorFocus = clickedActor;
            state.actorDetailsExpanded = true;
          }
          renderActoresView();
        });
      });
      document.getElementById('addBlockedCharacter')?.addEventListener('click', () => {
        if (!actor) return;
        const input = document.getElementById('blockedCharacterInput');
        const characterName = String(input?.value || '').trim();
        if (!characterName) return;
        const normalizedCharacterName = normalizeName(characterName);
        const canonicalCharacterName = VIDEOS.find((video) => normalizeName(video.personaje || '') === normalizedCharacterName)?.personaje || characterName;
        const withGreeting = getCharactersByActor(actor).map(name => normalizeName(name));
        if (withGreeting.includes(normalizedCharacterName)) {
          input.value = '';
          return;
        }

        const alreadyRegisteredBlockedVideo = VIDEOS.some((video) => (
          normalizeName(video.actor_de_doblaje || '') === normalizeName(actor)
          && normalizeName(video.personaje || '') === normalizedCharacterName
          && !hasGreetingVideo(video)
        ));

        if (!alreadyRegisteredBlockedVideo) {
          ensureBlockedPlaceholderForActorCharacter(actor, canonicalCharacterName);
        }

        const current = state.blockedCharactersByActor[actor] || [];
        state.blockedCharactersByActor[actor] = [...new Set([...current, canonicalCharacterName])];

        saveBlockedCharacters();
        saveVideos();
        refreshDependentViews();
        if (state.view === 'collection') renderCollectionView();
        renderActoresView();
      });
      viewActores.querySelectorAll('[data-open-character]').forEach((btn) => {
        btn.addEventListener('click', () => openCharacterProfile(btn.dataset.openCharacter));
      });
      viewActores.querySelectorAll('[data-open-video]').forEach((btn) => {
        btn.addEventListener('click', () => openVideoDetail(btn.dataset.openVideo));
      });
    }

    function renderVersionesView() {
      const multiverse = [...new Set(VIDEOS.map(v => v.personaje).filter(Boolean))].slice(0, 8);
      viewVersiones.innerHTML = `
        <section class="mock-shell">
          <h2>Versiones multiverso</h2>
          <ul>
            ${multiverse.map(name => `<li>${name} · Variante Alpha/Beta (mock)</li>`).join('') || '<li>Sin variantes disponibles.</li>'}
          </ul>
          <button class="neon-btn toon-btn">Explorar variantes</button>
        </section>
      `;
    }

    function renderFavoritosView() {
      const favorites = VIDEOS.slice(0, 3);
      viewFavoritos.innerHTML = `
        <section class="mock-shell">
          <h2>Favoritos</h2>
          ${favorites.length
            ? `<ul>${favorites.map(item => `<li>${item.personaje || 'Sin personaje'} · ${item.titulo || 'Sin título'}</li>`).join('')}</ul>`
            : '<p class="muted">No hay elementos prioritarios aún</p>'}
        </section>
      `;
    }

    function renderBuscarView() {
      viewBuscar.innerHTML = `
        <section class="mock-shell mock-shell--centered toon-panel">
          <input type="search" class="mock-search-input" placeholder="placeholder exacto solicitado" aria-label="Búsqueda global">
        </section>
      `;
    }

    function renderStatsView() {
      viewStats.innerHTML = `
        <section class="mock-shell toon-panel">
          <h2 class="toon-title">Estadísticas</h2>
          <div class="mock-row">
            <article class="kpi toon-kpi"><strong>KPI 1</strong><p class="muted">Conversión mock: 24%</p></article>
            <article class="kpi toon-kpi"><strong>KPI 2</strong><p class="muted">Retención mock: 72%</p></article>
            <article class="kpi toon-kpi"><strong>KPI 3</strong><p class="muted">Rareza alta mock: 19%</p></article>
          </div>
          <div class="mock-row">
            <div class="mock-box">Placeholder gráfico de líneas</div>
            <div class="mock-box">Placeholder gráfico de barras</div>
          </div>
        </section>
      `;
    }

    function renderConfigView() {
      const categories = [
        { key: 'voces', label: 'Voces', buttonLabel: 'AGREGAR VOZ' },
        { key: 'fondos', label: 'Fondos', buttonLabel: 'AGREGAR FONDO' }
      ];

      const renderAudioItems = (category) => {
        const items = Array.isArray(state.audioLibrary?.[category]) ? state.audioLibrary[category] : [];
        if (!items.length) return '<p class="muted">No hay archivos cargados aún.</p>';
        return `
          <ul class="audio-library-list">
            ${items.map((item) => `
              <li class="audio-library-item">
                <div>
                  <p class="audio-library-item-name">${escapeHtml(item.name || 'Archivo sin nombre')}</p>
                  <p class="audio-library-item-meta">${Math.max(1, Math.round((Number(item.size) || 0) / 1024))} KB · ${new Date(Number(item.createdAt) || Date.now()).toLocaleString('es-AR')}</p>
                </div>
                <audio controls preload="none" src="${escapeHtml(item.url || '')}" aria-label="Reproducir ${escapeHtml(item.name || 'audio')}"></audio>
              </li>
            `).join('')}
          </ul>
        `;
      };

      viewConfig.innerHTML = `
        <section class="mock-shell audio-library-shell">
          <h2>Configuración</h2>
          <div class="mock-row">
            <button class="neon-btn toon-btn">Importar JSON</button>
            <button class="neon-btn toon-btn">Exportar JSON</button>
            <div class="mock-box">
              <p>Tema</p>
              <div class="theme-toggle" aria-hidden="true"></div>
            </div>
          </div>
          <div class="audio-library-grid">
            ${categories.map(({ key, label, buttonLabel }) => {
              const status = state.uploadStatusByCategory?.[key] || { loading: false, error: '', success: '' };
              return `
                <article class="audio-library-card mock-box">
                  <div class="audio-library-header">
                    <h3>${label}</h3>
                    <button type="button" class="neon-btn" data-audio-trigger="${key}" ${status.loading ? 'disabled' : ''}>${status.loading ? 'SUBIENDO...' : buttonLabel}</button>
                    <input type="file" accept="audio/*" data-audio-input="${key}" class="audio-library-input" hidden>
                  </div>
                  <p class="audio-library-feedback ${status.error ? 'is-error' : status.success ? 'is-success' : ''}" aria-live="polite">${escapeHtml(status.error || status.success || '')}</p>
                  ${renderAudioItems(key)}
                </article>
              `;
            }).join('')}
          </div>
        </section>
      `;

      viewConfig.querySelectorAll('[data-audio-trigger]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const category = btn.dataset.audioTrigger;
          const input = viewConfig.querySelector(`[data-audio-input="${category}"]`);
          input?.click();
        });
      });

      viewConfig.querySelectorAll('[data-audio-input]').forEach((input) => {
        input.addEventListener('change', (event) => {
          const category = input.dataset.audioInput;
          if (!category) return;
          handleAudioLibraryFileSelected(event, category);
        });
      });
    }


    function cssSafe(text) {
      return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    }

    function ensureYoutubeIframeApi() {
      if (window.YT?.Player) return Promise.resolve(window.YT);
      if (marathonPlayerApiPromise) return marathonPlayerApiPromise;
      marathonPlayerApiPromise = new Promise((resolve) => {
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof previous === 'function') previous();
          resolve(window.YT);
        };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const script = document.createElement('script');
          script.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(script);
        }
      });
      return marathonPlayerApiPromise;
    }

    function getCurrentMarathonYoutubeId() {
      const currentVideo = state.marathon.queue[state.marathon.position];
      return getYoutubeId(currentVideo?.url_youtube || currentVideo?.url_video || '');
    }

    function updateMarathonUiState() {
      const playPauseBtn = document.getElementById('marathonPlayPauseBtn');
      if (playPauseBtn) playPauseBtn.textContent = state.marathon.isPlaying ? 'Pausa' : 'Play';
      viewMaraton.querySelectorAll('[data-marathon-index]').forEach((button) => {
        const index = Number(button.dataset.marathonIndex);
        button.classList.toggle('active', index === state.marathon.position);
      });
    }

    async function ensureMarathonQueuePlayer() {
      const mount = document.getElementById('marathonPlayerMount');
      if (!mount) return null;
      await ensureYoutubeIframeApi();
      if (marathonPlayer && marathonPlayer.getIframe && mount.contains(marathonPlayer.getIframe())) {
        return marathonPlayer;
      }
      const initialVideoId = getCurrentMarathonYoutubeId();
      marathonPlayerReady = false;
      marathonPlayer = new window.YT.Player('marathonPlayerMount', {
        videoId: initialVideoId || undefined,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            marathonPlayerReady = true;
            if (state.marathon.isPlaying) marathonPlayer.playVideo?.();
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              advanceMarathonQueue();
            }
          }
        }
      });
      return marathonPlayer;
    }

    function setMarathonPlaybackState(shouldPlay) {
      if (!marathonPlayerReady || !marathonPlayer) return;
      if (shouldPlay) {
        marathonPlayer.playVideo?.();
      } else {
        marathonPlayer.pauseVideo?.();
      }
    }

    async function loadMarathonVideoAtCurrentPosition({ forceLoad = false } = {}) {
      const videoId = getCurrentMarathonYoutubeId();
      if (!videoId) {
        updateMarathonUiState();
        return;
      }
      const player = await ensureMarathonQueuePlayer();
      if (!player || !marathonPlayerReady) {
        updateMarathonUiState();
        return;
      }
      const currentPlayerVideoId = player.getVideoData?.().video_id || '';
      if (forceLoad || currentPlayerVideoId !== videoId) {
        player.loadVideoById(videoId);
      }
      setMarathonPlaybackState(state.marathon.isPlaying);
      updateMarathonUiState();
    }

    function advanceMarathonQueue() {
      if (!state.marathon.queue.length) return;
      if (state.marathon.position < state.marathon.queue.length - 1) {
        state.marathon.position += 1;
      } else {
        state.marathon.position = 0;
      }
      state.marathon.isPlaying = true;
      loadMarathonVideoAtCurrentPosition({ forceLoad: true });
    }

    function changeView(next) {
      state.view = next;
      viewInicio.classList.toggle('active', next === 'inicio');
      viewMap.classList.toggle('active', next === 'map');
      viewUniverse.classList.toggle('active', next === 'universe');
      viewCollection.classList.toggle('active', next === 'collection');
      viewIndice.classList.toggle('active', next === 'indice');
      viewMaraton.classList.toggle('active', next === 'maraton');
      viewRarezas.classList.toggle('active', next === 'rarezas');
      viewActores.classList.toggle('active', next === 'actores');
      viewVersiones.classList.toggle('active', next === 'versiones');
      viewAchievements.classList.toggle('active', next === 'achievements');
      viewFavoritos.classList.toggle('active', next === 'favoritos');
      viewBuscar.classList.toggle('active', next === 'buscar');
      viewStats.classList.toggle('active', next === 'stats');
      viewConfig.classList.toggle('active', next === 'config');
      viewCharacterProfile.classList.toggle('active', next === 'characterProfile');
      document.querySelectorAll('.sidebar-nav .sidebar-item').forEach(btn => btn.classList.remove('active'));
      const activeNavByView = {
        map: navUniverses,
        universe: navUniverses,
        characterProfile: navIndice,
        indice: navIndice,
        actores: navActores,
        maraton: navMaraton
      };
      activeNavByView[next]?.classList.add('active');

      if (next === 'inicio') renderInicioView();
      if (next === 'map') renderMapView();
      if (next === 'universe') renderUniverseView();
      if (next === 'collection') renderCollectionView();
      if (next === 'achievements') renderAchievementsView();
      if (next === 'indice') renderIndiceView();
      if (next === 'maraton') renderMaratonView();
      if (next === 'rarezas') renderRarezasView();
      if (next === 'actores') renderActoresView();
      if (next === 'versiones') renderVersionesView();
      if (next === 'favoritos') renderFavoritosView();
      if (next === 'buscar') renderBuscarView();
      if (next === 'stats') renderStatsView();
      if (next === 'config') renderConfigView();
      if (next === 'characterProfile') renderCharacterProfile(state.characterProfileId);
    }

    toggleSidebar.onclick = () => {
      appLayout.classList.toggle('sidebar-collapsed');
      const isCollapsed = appLayout.classList.contains('sidebar-collapsed');
      toggleSidebar.textContent = isCollapsed ? '→' : '←';
      toggleSidebar.setAttribute('aria-label', isCollapsed ? 'Expandir menú' : 'Colapsar menú');
    };

    navUniverses.onclick = () => changeView(state.universe ? 'universe' : 'map');
    navIndice.onclick = () => changeView('indice');
    navActores.onclick = () => changeView('actores');
    navMaraton.onclick = () => changeView('maraton');

    state.universeNodes = loadUniverseNodesFromStorage();
    syncFavoriteUniverseSetFromNodes();
    state.universeMemberships = loadUniverseMembershipsFromStorage();
    loadVideosFromStorage();
    loadMarathonStateFromStorage();
    hydrateModelWithFallback();
    state.blockedCharactersByActor = loadBlockedCharactersFromStorage();
    state.audioLibrary = loadAudioLibraryFromStorage();
    sanitizeUniverseMembershipsAndPersist();
    syncBlockedCharactersToVideoPlaceholders();

    (async () => {
      initFirebase();
      await loadFromFirebase();
      hydrateModelWithFallback();
      syncBlockedCharactersToVideoPlaceholders();
      changeView('map');
    })();
