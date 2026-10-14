# Pro tips

Things I tell people when I mentor talks, plus the Slidev tricks that make presenting easier. None of them need the skill. All of them need you to actually do them.

## Presenting from Slidev

### Speaker notes from a static build: two tabs, one browser

You don't need the dev server on stage. A static build (mine live in an S3 bucket behind CloudFront, at `slides.erikzaadi.com`) still has the full presenter view:

1. Open the deck in one tab: `https://slides.erikzaadi.com/my-talk/#/1`
2. Open the presenter view in a second tab of the **same browser**: `https://slides.erikzaadi.com/my-talk/#/presenter/1`
3. Drag the first tab to the projector and press `f` for fullscreen. Keep the presenter tab on your laptop.

Advance from the presenter tab, and the audience tab follows. You get notes, a timer, the next slide and the current `[click]` highlighted, the same setup as Google Slides or PowerPoint presenter mode.

- It needs hash routing (`routerMode: hash`, already in the starter deck), so the `#/presenter` URL works on a plain static host.
- The tabs sync through the browser (`BroadcastChannel`), so both have to be in the same browser on the same machine. To control the deck from a different device, run `slidev --remote` instead.
- Deploying under a sub-path (`/my-talk/`)? Build with `npx slidev build --base /my-talk/`, or the assets 404.

### Edit your notes from the presenter view

When running locally (`npm run dev`, then `/presenter`), the notes in the presenter view are editable, and your changes save straight back to `slides.md`. Rehearse in presenter view and fix the beat that doesn't land, or move a `[click]` marker, the moment you notice it. Don't wait until "later". Later never comes, the talk does.

This only works with the dev server. A static build's notes are read-only.

## Rehearsals are everything

The slides are maybe a third of the talk. The rest is you, and the only way to get better at you is to rehearse.

### Stand up and speak aloud

Reading your notes in your head is not rehearsing. Stand up, face an imaginary room, and say the whole thing out loud, at talking speed, clicks included. You find the sentences you can't actually say, the transitions that don't exist, and the slide where you always run out of breath.

### Record yourself

Record a full run, then watch it. Yes, it's cringe. Suffer the cringe, it's worth it: you see the filler words, the pacing, the joke you rush, and the slide you stare at instead of the audience. Nobody else needs to see the recording.

### Let the story play in the background

Generate the rehearsal audio (`npm run notes:audio`) and play it as background noise: stuck in traffic, doing the dishes, on a walk. You're not studying it, just letting it run. After a few days the order of the story and the handoffs between slides stick without any effort, and the stand-up rehearsals start from a talk you already know instead of a deck you're still reading.

Regenerate it after big changes to the notes; only the slides you changed cost anything.

### Find a reset ceremony

Everyone blanks on stage at some point. What matters is what you do next. Pick a small physical ritual that brings you back: I scratch my beard. Sip of water, push up your glasses, a step to the side, anything that's yours and looks natural.

Then rehearse getting stuck:

1. **Get stuck on purpose.** Mid-rehearsal, stop, lose the thread on purpose.
2. **Do the ceremony.**
3. **Continue** from wherever makes sense: the slide on screen, the last beat, the next handoff.

Do it a couple of times per run, in random places, so it isn't tied to one slide. A random timer helps; on macOS this interrupts you every 1 to 5 minutes:

```sh
while true; do sleep $((RANDOM % 240 + 60)); say "stuck"; done
```

After a few runs the ceremony is a reflex. On stage, when you blank for real, your hand goes to your beard (or wherever) and the talk comes back with it. The audience sees someone pausing to think.

### Rehearse the real setup

Run through at least once with the exact setup you'll present with: the static build, the two tabs, your clicker, offline. Venue Wi-Fi is never your friend, which is why the GIFs and images ship inside the deck.

---

Pro tip: there's no such thing as too much rehearsal. Ask my beard.
