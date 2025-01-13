terminate_processes() {
    pkill -f cloudflared
    pkill -f "node.*server\.js" 2>/dev/null
    pkill -f "daemon.sh" 2>/dev/null
}
terminate_processes