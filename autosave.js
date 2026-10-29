"use strict";
(function (root) {
  const codec =
    typeof module !== "undefined"
      ? require("./vendor/lz-string.js")
      : root.LZString;
  function workerSource() {
    return `const f=String.fromCharCode;const LZString={_compress:${codec._compress.toString()},compressToUTF16:${codec.compressToUTF16.toString()}};self.onmessage=e=>{try{self.postMessage({generation:e.data.generation,encoded:'CL3:'+LZString.compressToUTF16(JSON.stringify(e.data.state))});}catch(error){self.postMessage({generation:e.data.generation,error:error.message});}};`;
  }
  function create({
    getState,
    write,
    onStatus = () => {},
    onError = () => {},
    delay = 350,
  }) {
    let generation = 0,
      timer = null,
      worker = null,
      busy = false,
      dirty = false,
      closed = false,
      blocked = false;
    const background =
      typeof Worker !== "undefined" && typeof Blob !== "undefined";
    function status(value) {
      onStatus(value);
    }
    function commit(message) {
      busy = false;
      if (message.generation === generation && !closed) {
        if (message.error) { blocked=true; status("Não salvo"); onError(Error(message.error)); }
        else {
          try {
            write(message.encoded);
            dirty = false;
            status("Salvo");
          } catch (error) {
            blocked=true;
            status("Não salvo");
            onError(error);
          }
        }
      }
      if (dirty && !closed && !blocked) queue();
    }
    if (background) {
      try {
        const url = URL.createObjectURL(
          new Blob([workerSource()], { type: "text/javascript" }),
        );
        worker = new Worker(url);
        URL.revokeObjectURL(url);
        worker.onmessage = (e) => commit(e.data);
        worker.onerror = (e) => {
          worker.terminate();
          worker = null;
          busy = false;
          // Retry using the synchronous codec if the worker failed.
          if (dirty && !closed && !blocked) queue();
        };
      } catch {
        worker = null;
      }
    }
    function queue() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (closed || blocked || busy || !dirty) return;
        const state = getState();
        if (!state?.clubId) return;
        const current = generation;
        busy = true;
        status("Salvando…");
        if (worker) {
          worker.postMessage({ generation: current, state });
        } else {
          try {
            commit({
              generation: current,
              encoded: "CL3:" + codec.compressToUTF16(JSON.stringify(state)),
            });
          } catch (error) {
            busy = false;
            blocked = true;
            status("Não salvo");
            onError(error);
          }
        }
      }, delay);
    }
    return {
      request() {
        closed = false;
        blocked = false;
        dirty = true;
        generation++;
        status("Alterações pendentes");
        queue();
      },
      markDirty() {
        dirty = true;
        generation++;
      },
      cancel() {
        generation++;
        dirty = false;
        closed = true;
        clearTimeout(timer);
        timer = null;
        status("Salvo");
      },
      flush() {
        blocked = false;
        generation++;
        clearTimeout(timer);
        timer = null;
        const state = getState();
        if (!state?.clubId) return true;
        try {
          write("CL3:" + codec.compressToUTF16(JSON.stringify(state)));
          dirty = false;
          status("Salvo");
          return true;
        } catch (error) {
          blocked = true;
          status("Não salvo");
          onError(error);
          return false;
        }
      },
      get dirty() {
        return dirty;
      },
      get background() {
        return Boolean(worker);
      },
      dispose() {
        closed = true;
        clearTimeout(timer);
        worker?.terminate();
      },
    };
  }
  const api = { create, workerSource };
  root.LegacyAutosave = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
