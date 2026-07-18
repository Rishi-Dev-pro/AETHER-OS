export interface IntentRuleConfig {
  intent: string;
  category: string;
  domain: string;
  patterns: string[]; // Stored as string representations, compiled once in the classifier
  keywords: string[];
}

export interface IntentConfig {
  confidenceThresholds: {
    high: number;
    medium: number;
    low: number;
    clarification: number;
  };
  keywordThreshold: number; // minimum overlap ratio to classify via keywords
  rules: IntentRuleConfig[];
  applicationRegistry: string[];
  urlPattern: string;
  numberPattern: string;
  coordinatePattern: string;
}

export const intentConfig: IntentConfig = {
  confidenceThresholds: {
    high: 1.0,
    medium: 0.6,
    low: 0.2,
    clarification: 0.5,
  },
  keywordThreshold: 0.3,
  applicationRegistry: [
    "VS Code",
    "Chrome",
    "Firefox",
    "Spotify",
    "Finder",
    "Terminal",
    "Settings",
    "Slack",
    "Discord",
    "Notion",
    "AETHER",
  ],
  urlPattern: "(?:https?:\\/\\/)?(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/\\/=]*)",
  numberPattern: "\\b\\d+(?:\\.\\d+)?\\b",
  coordinatePattern: "(?:\\(?(\\d+)\\s*,\\s*(\\d+)\\)?)|(?:x:?\\s*(\\d+)\\s*,?\\s*y:?\\s*(\\d+))",
  rules: [
    {
      intent: "GREET",
      category: "CONVERSATION",
      domain: "ASSISTANT",
      patterns: [
        "^(?:hello|hi|hey|greetings|yo|good\\s+morning|good\\s+evening)(?:\\s+aether|\\s+buddy)?$",
      ],
      keywords: ["hello", "hi", "hey", "greetings", "yo", "good morning", "good evening"],
    },
    {
      intent: "OPEN",
      category: "INTERACTION",
      domain: "APPLICATION",
      patterns: [
        "^(?:open|launch|start|run|execute|load|switch\\s+to|focus)\\s+(.+)$",
      ],
      keywords: ["open", "launch", "start", "run", "execute", "load", "switch to", "focus"],
    },
    {
      intent: "CLOSE",
      category: "INTERACTION",
      domain: "APPLICATION",
      patterns: [
        "^(?:close|quit|kill|exit|terminate|stop)\\s+(.+)$",
      ],
      keywords: ["close", "quit", "exit", "kill", "terminate", "stop"],
    },
    {
      intent: "MINIMIZE",
      category: "INTERACTION",
      domain: "APPLICATION",
      patterns: [
        "^(?:minimize|hide)\\s+(.+)$",
      ],
      keywords: ["minimize", "hide"],
    },
    {
      intent: "MAXIMIZE",
      category: "INTERACTION",
      domain: "APPLICATION",
      patterns: [
        "^(?:maximize|unhide)\\s+(.+)$",
      ],
      keywords: ["maximize", "unhide"],
    },
    {
      intent: "RESTORE",
      category: "INTERACTION",
      domain: "APPLICATION",
      patterns: [
        "^(?:restore)\\s+(.+)$",
      ],
      keywords: ["restore"],
    },
    {
      intent: "FOCUS",
      category: "INTERACTION",
      domain: "APPLICATION",
      patterns: [
        "^(?:focus)\\s+(.+)$",
      ],
      keywords: ["focus"],
    },
    {
      intent: "NAVIGATE",
      category: "INTERACTION",
      domain: "BROWSER",
      patterns: [
        "^(?:go\\s+to|open\\s+url|navigate\\s+to|visit|open\\s+website)\\s+(.+)$",
      ],
      keywords: ["navigate", "goto", "visit", "url", "website", "http", "go to"],
    },
    {
      intent: "REFRESH",
      category: "INTERACTION",
      domain: "BROWSER",
      patterns: [
        "^(?:refresh|reload)(?:\\s+page)?$",
      ],
      keywords: ["refresh", "reload", "refresh page", "reload page"],
    },
    {
      intent: "GO_BACK",
      category: "INTERACTION",
      domain: "BROWSER",
      patterns: [
        "^(?:go\\s+back|back)$",
      ],
      keywords: ["back", "go back", "backward"],
    },
    {
      intent: "GO_FORWARD",
      category: "INTERACTION",
      domain: "BROWSER",
      patterns: [
        "^(?:go\\s+forward|forward)$",
      ],
      keywords: ["forward", "go forward"],
    },
    {
      intent: "SCROLL_UP",
      category: "INTERACTION",
      domain: "BROWSER",
      patterns: [
        "^(?:scroll\\s+up|go\\s+up)$",
      ],
      keywords: ["scroll", "up", "upward", "scroll up"],
    },
    {
      intent: "SCROLL_DOWN",
      category: "INTERACTION",
      domain: "BROWSER",
      patterns: [
        "^(?:scroll\\s+down|go\\s+down)$",
      ],
      keywords: ["scroll", "down", "downward", "scroll down"],
    },
    {
      intent: "SEARCH",
      category: "INQUIRY",
      domain: "BROWSER",
      patterns: [
        "^(?:search\\s+for|search)\\s+(.+)$",
      ],
      keywords: ["search", "search for", "google", "look up", "lookup", "find", "locate"],
    },
    {
      intent: "VOLUME_UP",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^(?:increase|raise|up)\\s+volume(?:\\s+(?:to\\s+)?(\\d+))?$",
        "^volume\\s+up$",
      ],
      keywords: ["increase volume", "volume up", "raise volume", "louder"],
    },
    {
      intent: "VOLUME_DOWN",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^(?:decrease|lower|down)\\s+volume(?:\\s+(?:to\\s+)?(\\d+))?$",
        "^volume\\s+down$",
      ],
      keywords: ["decrease volume", "volume down", "lower volume", "quieter"],
    },
    {
      intent: "SET_VOLUME",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^(?:set\\s+)?volume\\s+(?:to\\s+)?(\\d+)$",
      ],
      keywords: ["set volume", "volume"],
    },
    {
      intent: "SET_BRIGHTNESS",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^(?:set\\s+)?brightness\\s+(?:to\\s+)?(\\d+)$",
      ],
      keywords: ["set brightness", "brightness"],
    },
    {
      intent: "MUTE",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^mute$",
      ],
      keywords: ["mute"],
    },
    {
      intent: "UNMUTE",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^unmute$",
      ],
      keywords: ["unmute"],
    },
    {
      intent: "LOCK_SCREEN",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^lock\\s+(?:screen|computer)$",
      ],
      keywords: ["lock screen", "lock computer", "lock"],
    },
    {
      intent: "SLEEP",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^(?:sleep|put\\s+computer\\s+to\\s+sleep)(?:\\s+computer)?$",
      ],
      keywords: ["sleep", "sleep computer"],
    },
    {
      intent: "SHUTDOWN",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^(?:shutdown|turn\\s+off)$",
      ],
      keywords: ["shutdown", "turn off"],
    },
    {
      intent: "RESTART",
      category: "INTERACTION",
      domain: "SYSTEM",
      patterns: [
        "^(?:restart|reboot)$",
      ],
      keywords: ["restart", "reboot"],
    },
    {
      intent: "OPEN_DIR",
      category: "INTERACTION",
      domain: "FILESYSTEM",
      patterns: [
        "^open\\s+(downloads|documents|desktop)$",
      ],
      keywords: ["open downloads", "open documents", "open desktop"],
    },
    {
      intent: "CREATE_DIR",
      category: "INTERACTION",
      domain: "FILESYSTEM",
      patterns: [
        "^(?:create|make)\\s+(?:folder|directory)(?:\\s+(.+))?$",
      ],
      keywords: ["create folder", "create directory", "new folder", "make directory"],
    },
    {
      intent: "DELETE_FILE",
      category: "INTERACTION",
      domain: "FILESYSTEM",
      patterns: [
        "^(?:delete|remove|erase|destroy)\\s+(?:file\\s+)?(.+)$",
      ],
      keywords: ["delete file", "remove file", "delete", "remove", "erase", "destroy"],
    },
    {
      intent: "RENAME_FILE",
      category: "INTERACTION",
      domain: "FILESYSTEM",
      patterns: [
        "^rename\\s+(?:file\\s+)?(.+)(?:\\s+to\\s+(.+))?$",
      ],
      keywords: ["rename file", "rename"],
    },
    {
      intent: "MOVE_FILE",
      category: "INTERACTION",
      domain: "FILESYSTEM",
      patterns: [
        "^move\\s+(?:file\\s+)?(.+)(?:\\s+to\\s+(.+))?$",
      ],
      keywords: ["move file", "move"],
    },
    {
      intent: "COPY_FILE",
      category: "INTERACTION",
      domain: "FILESYSTEM",
      patterns: [
        "^copy\\s+(?:file\\s+)?(.+)$",
      ],
      keywords: ["copy file", "copy"],
    },
    {
      intent: "PASTE_FILE",
      category: "INTERACTION",
      domain: "FILESYSTEM",
      patterns: [
        "^paste$",
      ],
      keywords: ["paste"],
    },
    {
      intent: "CLOSE_WINDOW",
      category: "INTERACTION",
      domain: "WINDOW",
      patterns: [
        "^close\\s+window$",
      ],
      keywords: ["close window"],
    },
    {
      intent: "MAXIMIZE_WINDOW",
      category: "INTERACTION",
      domain: "WINDOW",
      patterns: [
        "^maximize\\s+window$",
      ],
      keywords: ["maximize window"],
    },
    {
      intent: "MINIMIZE_WINDOW",
      category: "INTERACTION",
      domain: "WINDOW",
      patterns: [
        "^minimize\\s+window$",
      ],
      keywords: ["minimize window"],
    },
    {
      intent: "RESIZE_WINDOW",
      category: "INTERACTION",
      domain: "WINDOW",
      patterns: [
        "^resize\\s+window$",
      ],
      keywords: ["resize window"],
    },
    {
      intent: "MOVE_WINDOW",
      category: "INTERACTION",
      domain: "WINDOW",
      patterns: [
        "^move\\s+window$",
      ],
      keywords: ["move window"],
    },
    {
      intent: "NEXT_WINDOW",
      category: "INTERACTION",
      domain: "WINDOW",
      patterns: [
        "^(?:next|switch\\s+to\\s+next)\\s+window$",
      ],
      keywords: ["next window"],
    },
    {
      intent: "PREVIOUS_WINDOW",
      category: "INTERACTION",
      domain: "WINDOW",
      patterns: [
        "^(?:previous|switch\\s+to\\s+previous)\\s+window$",
      ],
      keywords: ["previous window"],
    },
    {
      intent: "CLICK",
      category: "INTERACTION",
      domain: "MOUSE",
      patterns: [
        "^click(?:\\s+(?:here|this|there))?$",
      ],
      keywords: ["click", "click here", "click this", "click there"],
    },
    {
      intent: "DOUBLE_CLICK",
      category: "INTERACTION",
      domain: "MOUSE",
      patterns: [
        "^double\\s+click$",
      ],
      keywords: ["double click"],
    },
    {
      intent: "RIGHT_CLICK",
      category: "INTERACTION",
      domain: "MOUSE",
      patterns: [
        "^right\\s+click$",
      ],
      keywords: ["right click"],
    },
    {
      intent: "DRAG",
      category: "INTERACTION",
      domain: "MOUSE",
      patterns: [
        "^drag(?:\\s+(.+))?$",
      ],
      keywords: ["drag"],
    },
    {
      intent: "DROP",
      category: "INTERACTION",
      domain: "MOUSE",
      patterns: [
        "^drop(?:\\s+(.+))?$",
      ],
      keywords: ["drop"],
    },
    {
      intent: "SELECT",
      category: "INTERACTION",
      domain: "MOUSE",
      patterns: [
        "^select(?:\\s+(.+))?$",
      ],
      keywords: ["select"],
    },
    {
      intent: "HOVER",
      category: "INTERACTION",
      domain: "MOUSE",
      patterns: [
        "^hover(?:\\s+(.+))?$",
      ],
      keywords: ["hover"],
    },
    {
      intent: "KEY_COPY",
      category: "INTERACTION",
      domain: "KEYBOARD",
      patterns: [
        "^copy$",
      ],
      keywords: ["copy"],
    },
    {
      intent: "KEY_PASTE",
      category: "INTERACTION",
      domain: "KEYBOARD",
      patterns: [
        "^paste$",
      ],
      keywords: ["paste"],
    },
    {
      intent: "KEY_UNDO",
      category: "INTERACTION",
      domain: "KEYBOARD",
      patterns: [
        "^undo$",
      ],
      keywords: ["undo"],
    },
    {
      intent: "KEY_REDO",
      category: "INTERACTION",
      domain: "KEYBOARD",
      patterns: [
        "^redo$",
      ],
      keywords: ["redo"],
    },
    {
      intent: "KEY_CUT",
      category: "INTERACTION",
      domain: "KEYBOARD",
      patterns: [
        "^cut$",
      ],
      keywords: ["cut"],
    },
    {
      intent: "SELECT_ALL",
      category: "INTERACTION",
      domain: "KEYBOARD",
      patterns: [
        "^select\\s+all$",
      ],
      keywords: ["select all"],
    },
    {
      intent: "TYPE_TEXT",
      category: "INTERACTION",
      domain: "KEYBOARD",
      patterns: [
        "^type\\s+(.+)$",
      ],
      keywords: ["type", "keyboard type"],
    },
    {
      intent: "PRESS_KEY",
      category: "INTERACTION",
      domain: "KEYBOARD",
      patterns: [
        "^press\\s+(.+)$",
      ],
      keywords: ["press", "press key"],
    },
    {
      intent: "FIND_FILES",
      category: "INQUIRY",
      domain: "FILESYSTEM",
      patterns: [
        "^(?:find|locate|where\\s+is|show)(?:\\s+file|\\s+my)?\\s+(.+)$",
      ],
      keywords: ["find", "locate", "where is", "show"],
    },
    {
      intent: "QUERY",
      category: "INQUIRY",
      domain: "ASSISTANT",
      patterns: [
        "^(?:what\\s+is|who\\s+is|why|how)\\s+(.+)$",
      ],
      keywords: ["what", "how", "why", "who", "explain"],
    },
    {
      intent: "CANCEL",
      category: "UTILITY",
      domain: "SYSTEM",
      patterns: [
        "^(?:cancel|never\\s+mind|nevermind|forget\\s+it|stop|abort|exit|dismiss|ignore\\s+that)$",
      ],
      keywords: ["cancel", "never mind", "nevermind", "forget it", "stop", "abort", "exit", "dismiss", "ignore that"],
    },
    {
      intent: "CONFIRM",
      category: "UTILITY",
      domain: "SYSTEM",
      patterns: [
        "^(?:yes|correct|do\\s+it|proceed|continue|retry)$",
      ],
      keywords: ["yes", "correct", "do it", "proceed", "continue", "retry"],
    },
    {
      intent: "DENY",
      category: "UTILITY",
      domain: "SYSTEM",
      patterns: [
        "^(?:no|wrong)$",
      ],
      keywords: ["no", "wrong"],
    },
  ],
};
