function AVPlayer(src, laURL) {
  self = this;
  this._mediaElement = AVPlayer.createPlayerObject();
  this._drmAgent = AVPlayer.createDrmAgent();

  // info
  this._state = AVPlayer.PLAY_STATE_EMPTY; // has nth yet
  this.buffered = {
    length: 0,
    start: function (index) {
      return 0;
    },
    end: function (index) {
      return self.currentTime;
    },
  };
  //   this.duration = 0;
  //   this.currentTime = 0;
  this._volume = 1;
  this._volumeBeforeMute = 1;
  this._muted = false;

  this.paused = false;
  this.ended = false;
  this.error = null;
  //   this.readyState = 0;

  // events
  this.onPlayStateChange = null; // event callback
  // @TODO: throttle this event to avoid too many events
  this._mediaElement.onPlayStateChange = throttle(
    this._handlePlayStateChange.bind(this), // function
    100, // wait
    {
      // options
      leading: true,
    }
  );
  // methods
  this.getMediaElement = function () {
    return self._mediaElement;
  };

  this._setProtectionData = function (licenseServerURL, callback) {
    var msgType = "application/vnd.ms-playready.initiator+xml";
    var DRMSysID = "urn:dvb:casystemid:19219";
    var xmlLicenseAcquisition =
      AVPlayer.generatePlayreadyRequestXML(licenseServerURL);

    try {
      this._drmAgent.onDRMMessageResult = function (
        msgType,
        resultMsg,
        resultCode
      ) {
        self.drmMsgHandler(msgType, resultMsg, resultCode, callback.bind(self));
      };
    } catch (e) {
      logger("setProtectionData Error 1: " + e.message);
    }
    try {
      this._drmAgent.onDRMRightsError = this.drmRightsErrorHandler.bind(this);
    } catch (e) {
      logger("setProtectionData Error 2: " + e.message);
    }
    try {
      this._drmAgent.sendDRMMessage(msgType, xmlLicenseAcquisition, DRMSysID);
    } catch (e) {
      logger("setProtectionData Error 3: " + e.message);
    }
  };

  this.setSource = function (src) {
    // check if source is string, and if so, check if it starts with http
    if (typeof src === "string") {
      if (src.indexOf("http") === 0) {
        this._src = src;
        this._state = AVPlayer.PLAY_STATE_STOPPED;
      } else {
        throw new Error("Invalid source");
      }
    } else {
      throw new Error("Source must be a string");
    }
  };

  this.setLaURL = function (laURL) {
    this._laURL = laURL;
  };

  // default
  if (src) {
    this.setSource(src);
  }
  if (laURL) {
    this.setLaURL(laURL);
  }

  this.load = function (autoPlay) {
    var type = "application/dash+xml";
    if (this._src.match(/mp4$/)) {
      this._mediaElement.setAttribute("type", "video/mp4");
    } else {
      this._mediaElement.setAttribute("type", type);
    }

    this._mediaElement.onDRMRightsError = this.drmRightsErrorHandler.bind(this);
    try {
      this._mediaElement.data = url;
    } catch (e) {
      console.log(e.message);
    }

    if (this._laURL) {
      this._setProtectionData(this._laURL, function () {
        this._mediaElement.setSource(this._src);
        if (autoPlay) {
          this.play();
        }
      });
    } else {
      this._mediaElement.setSource(this._src);
      if (autoPlay) {
        this.play();
      }
    }
  };

  // control methods
  this.play = function () {
    switch (this._state) {
      case AVPlayer.PLAY_STATE_PLAYING:
      case AVPlayer.PLAY_STATE_BUFFERING:
        break;
      case AVPlayer.PLAY_STATE_PAUSED:
      case AVPlayer.PLAY_STATE_STOPPED:
      case AVPlayer.PLAY_STATE_FINISHED:
        this._mediaElement.play(1);
        break;
      default:
        throw (
          "Cannot resume while in the '" +
          AVPlayer.getPlayStateStringFromCode(this._state) +
          "' state"
        );
    }
  };

  this.pause = function () {
    switch (this._state) {
      case AVPlayer.PLAY_STATE_PLAYING:
      case AVPlayer.PLAY_STATE_BUFFERING:
        this._mediaElement.play(0);
        break;
      case AVPlayer.PLAY_STATE_PAUSED:
        break;
      default:
        throw (
          "Cannot pause while in the '" +
          AVPlayer.getPlayStateStringFromCode(this._state) +
          "' state"
        );
    }
  };

  this.stop = function () {
    switch (this._state) {
      case AVPlayer.PLAY_STATE_PLAYING:
      case AVPlayer.PLAY_STATE_BUFFERING:
      case AVPlayer.PLAY_STATE_PAUSED:
      case AVPlayer.PLAY_STATE_FINISHED:
        this._mediaElement.stop();
        break;
      case AVPlayer.PLAY_STATE_STOPPED:
        break;
      default:
        throw (
          "Cannot stop while in the '" +
          AVPlayer.getPlayStateStringFromCode(this._state) +
          "' state"
        );
    }
  };

  this.destroy = function () {
    this.stop();
    this._mediaElement.data = '';
    this._setProtectionData('', null);
  };
}

//#region setters and getters

// src
Object.defineProperty(AVPlayer.prototype, "src", {
  get: function () {
    return this._src;
  },
  set: function (src) {
    this.setSource(src);
  },
});

// currentTime
Object.defineProperty(AVPlayer.prototype, "currentTime", {
  get: function () {
    return this._mediaElement.playPosition / 1000;
  },
  set: function (currentTime) {
    this._mediaElement.seek(currentTime * 1000);
  },
});

// duration
Object.defineProperty(AVPlayer.prototype, "duration", {
    get: function () {
        return this._mediaElement.playTime / 1000;
    },
});


// volume
Object.defineProperty(AVPlayer.prototype, "volume", {
  get: function () {
    return this._volume;
  },
  set: function (volume) {
    this._mediaElement.setVolume(volume * 100);
    this._volume = volume;
    if (!this._muted) {
      this._volumeBeforeMute = volume;
    }
  },
});

// muted
Object.defineProperty(AVPlayer.prototype, "muted", {
  get: function () {
    return this._muted;
  },
  set: function (muted) {
    this._muted = muted;
    this.volume = muted ? 0 : this._volumeBeforeMute;
  },
});

// readyState
Object.defineProperty(AVPlayer.prototype, "readyState", {
  get: function () {
    switch (this._state) {
      case AVPlayer.PLAY_STATE_EMPTY:
        return 0;
      case AVPlayer.PLAY_STATE_CONNECTING:
        return 1;
      case AVPlayer.PLAY_STATE_BUFFERING:
        return 3;
      case AVPlayer.PLAY_STATE_STOPPED:
      case AVPlayer.PLAY_STATE_PLAYING:
      case AVPlayer.PLAY_STATE_PAUSED:
      case AVPlayer.PLAY_STATE_FINISHED:
        return 4;
      default:
        return -1;
    }
  },
});

//#endregion

//#region constants
AVPlayer.PLAY_STATE_EMPTY = -1;
AVPlayer.PLAY_STATE_STOPPED = 0;
AVPlayer.PLAY_STATE_PLAYING = 1;
AVPlayer.PLAY_STATE_PAUSED = 2;
AVPlayer.PLAY_STATE_CONNECTING = 3;
AVPlayer.PLAY_STATE_BUFFERING = 4;
AVPlayer.PLAY_STATE_FINISHED = 5;
AVPlayer.PLAY_STATE_ERROR = 6;

AVPlayer.CONTENT_TYPE_VIDEO = 0;
AVPlayer.CONTENT_TYPE_AUDIO = 1;
AVPlayer.CONTENT_TYPE_SUBTITLE = 2;

//#endregion

AVPlayer.getPlayStateStringFromCode = function (code) {
  switch (code) {
    case AVPlayer.PLAY_STATE_EMPTY:
      return "EMPTY";
    case AVPlayer.PLAY_STATE_STOPPED:
      return "STOPPED";
    case AVPlayer.PLAY_STATE_PLAYING:
      return "PLAYING";
    case AVPlayer.PLAY_STATE_PAUSED:
      return "PAUSED";
    case AVPlayer.PLAY_STATE_CONNECTING:
      return "CONNECTING";
    case AVPlayer.PLAY_STATE_BUFFERING:
      return "BUFFERING";
    case AVPlayer.PLAY_STATE_FINISHED:
      return "FINISHED";
    case AVPlayer.PLAY_STATE_ERROR:
      return "ERROR";
    default:
      return "UNKNOWN";
  }
};

AVPlayer.prototype._handlePlayStateChange = function (state) {
  this._state = state;
  this.error = null;
  if (this.onPlayStateChange) {
    this.onPlayStateChange(state);
  }
  switch (state) {
    case AVPlayer.PLAY_STATE_STOPPED:
      this.paused = true;
      this.ended = false;
      break;
    case AVPlayer.PLAY_STATE_PLAYING:
      this.paused = false;
      this.ended = false;
      break;
    case AVPlayer.PLAY_STATE_PAUSED:
      this.paused = true;
      this.ended = false;
      break;
    case AVPlayer.PLAY_STATE_BUFFERING:
      this.paused = false;
      this.ended = false;
      break;
    case AVPlayer.PLAY_STATE_ERROR:
      this.paused = true;
      this.ended = false;
      this.error = this._mediaElement.error;
      break;
    case AVPlayer.PLAY_STATE_FINISHED:
      this.paused = true;
      this.ended = true;
      break;
    default:
      this.paused = true;
      this.ended = false;
      break;
  }
};

AVPlayer.createPlayerObject = function () {
  if (false && window.oipfObjectFactory) {
    return oipfObjectFactory.createVideoMpegObject();
  } else {
    var playerElement = document.createElement("object");
    playerElement.setAttribute("type", "video/mpeg");
    return playerElement;
  }
};

//#region DRM
AVPlayer.createDrmAgent = function () {
  if (false && window.oipfObjectFactory) {
    return oipfObjectFactory.createDrmAgentObject();
  } else {
    var drmAgent = document.createElement("object");
    drmAgent.setAttribute("type", "application/oipfDrmAgent");
    return drmAgent;
  }
};

AVPlayer.generatePlayreadyRequestXML = function (laURL) {
  var xmlLicenceAcquisition =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<PlayReadyInitiator xmlns="http://schemas.microsoft.com/DRM/2007/03/protocols/">' +
    "<LicenseServerUriOverride>" +
    "<LA_URL>" +
    laURL +
    "</LA_URL>" +
    "</LicenseServerUriOverride>" +
    "</PlayReadyInitiator>";
  return xmlLicenceAcquisition;
};

// DRM Agent Event Handlers
AVPlayer.prototype.drmMsgHandler = function (
  msgID,
  resultMsg,
  resultCode,
  callback
) {
  logger("msgID, resultMsg, resultCode: ", msgID, ",", resultMsg, ",", resultCode);
  var errorMessage = "";
  switch (resultCode) {
    case 0:
      if (callback) {
        callback();
      }
      break;
    case 1:
      errorMessage = "DRM: Unspecified error";
      break;
    case 2:
      errorMessage = "DRM: Cannot process request";
      break;
    case 3:
      errorMessage = "DRM: Wrong format";
      break;
    case 4:
      errorMessage = "DRM: User Consent Needed";
      break;
    case 5:
      errorMessage = "DRM: Unknown DRM system";
      break;
  }

  if (resultCode > 0) {
    logger("ERROR: ", errorMessage);
  }
};

AVPlayer.prototype.drmRightsErrorHandler = function (errorCode, errorMsg) {
    logger("DRM: ", errorCode, ": ", errorMsg);
  var errorMessage = "";
  switch (errorCode) {
    case 0:
      errorMessage = "DRM: No license error";
      break;
    case 1:
      errorMessage = "DRM: Invalid license error";
      break;
    case 2:
      errorMessage = "license valid! OKAY";
      break;
  }
  logger("ERROR: ", errorMessage);
};
//#endregion

//#region utils
function logger() {
  if (window.console) {
    console.log.apply(console, arguments);
  }
}

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function throttle(func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;
  if (!options) options = {};
  var later = function () {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };
  return function () {
    var now = Date.now();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
}
//#endregion
