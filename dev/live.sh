#!/usr/bin/env bash
# Runs Claude Code with this plugin in a detached tmux session, so the band can
# be driven and captured from a script or by another agent.
#
#   dev/live.sh start [claude args...]  starts Claude Code with the plugin loaded
#   dev/live.sh send TEXT               types TEXT into the prompt and presses Enter
#   dev/live.sh keys KEY...             sends raw tmux keys, such as Enter, Escape or 1
#   dev/live.sh text                    prints the screen as plain text
#   dev/live.sh snap OUT.png [ROWS]     renders the screen, or its last ROWS rows, to a PNG
#   dev/live.sh attach                  attaches to the session, to watch or type yourself
#   dev/live.sh stop                    ends the session
#
# Claude Code runs in a scratch folder, so its edits stay out of the
# repository. Inside a Claude Code cloud session, it also gets a config folder
# of its own, with onboarding done, so it skips the login and theme screens.
set -euo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
SESSION=${PET_LIVE_SESSION:-pet}
DIR=${PET_LIVE_DIR:-${TMPDIR:-/tmp}/pet-live}
COLS=${PET_LIVE_COLS:-110}
ROWS=${PET_LIVE_ROWS:-36}

cmd=${1:-}
shift || true

case "$cmd" in
  start)
    if tmux has-session -t "$SESSION" 2>/dev/null; then
      echo "tmux session '$SESSION' is already running; run '$0 stop' first" >&2
      exit 1
    fi
    mkdir -p "$DIR/work"
    # Unset the variables that would make the inner Claude Code think it runs
    # inside this one
    env_args=(-u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT)
    if [[ -n "${CLAUDE_CODE_REMOTE:-}" ]]; then
      mkdir -p "$DIR/config"
      if [[ ! -f "$DIR/config/.claude.json" ]]; then
        printf '{"hasCompletedOnboarding":true,"theme":"dark","projects":{"%s":{"hasTrustDialogAccepted":true}}}\n' \
          "$DIR/work" >"$DIR/config/.claude.json"
      fi
      env_args+=(-u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_REMOTE_SESSION_ID -u CLAUDE_CODE_MESSAGING_SOCKET)
      env_args+=(-u CLAUDE_CODE_TEE_SDK_STDOUT -u CLAUDE_CODE_DIAGNOSTICS_FILE)
      env_args+=("CLAUDE_CONFIG_DIR=$DIR/config")
    fi
    printf -v claude_cmd '%q ' env "${env_args[@]}" TERM=xterm-256color COLORTERM=truecolor \
      claude --plugin-dir "$REPO" "$@"
    tmux new-session -d -s "$SESSION" -x "$COLS" -y "$ROWS" -c "$DIR/work" "$claude_cmd"
    echo "Started Claude Code in tmux session '$SESSION', working in $DIR/work"
    ;;
  send)
    # Typing and Enter go separately, so a slash command's menu has time to open
    tmux send-keys -t "$SESSION" -l "$*"
    sleep 0.5
    tmux send-keys -t "$SESSION" Enter
    ;;
  keys)
    tmux send-keys -t "$SESSION" "$@"
    ;;
  text)
    tmux capture-pane -t "$SESSION" -p
    ;;
  snap)
    tmux capture-pane -t "$SESSION" -p -e | node "$REPO/dev/snap.mjs" "$@"
    ;;
  attach)
    tmux attach -t "$SESSION"
    ;;
  stop)
    tmux kill-session -t "$SESSION"
    ;;
  *)
    sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//' >&2
    exit 1
    ;;
esac
