# Start the ScriptTagger Vite React frontend.
set -e
cd "$(dirname "$0")/frontend"
exec npm run dev "$@"
