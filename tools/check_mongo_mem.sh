#!/bin/bash

PID=$(pgrep -x mongod)
if [ -z "$PID" ]; then
    echo "MongoDB is not running"
    exit 1
fi

format_bytes() {
    local bytes=$1
    if [ "$bytes" -ge 1073741824 ]; then
        echo "$(awk "BEGIN{printf \"%.2f\", $bytes/1073741824}")GB"
    elif [ "$bytes" -ge 1048576 ]; then
        echo "$(awk "BEGIN{printf \"%.2f\", $bytes/1048576}")MB"
    else
        echo "$(awk "BEGIN{printf \"%.2f\", $bytes/1024}")KB"
    fi
}

# Process memory from /proc
RSS=$(awk '/VmRSS/{print $2}' /proc/$PID/status 2>/dev/null)
VMS=$(awk '/VmSize/{print $2}' /proc/$PID/status 2>/dev/null)

if [ -z "$RSS" ]; then
    echo "Cannot read process info (check permissions)"
    exit 1
fi

RSS_BYTES=$((RSS * 1024))
VMS_BYTES=$((VMS * 1024))

echo "==============================="
echo "  MongoDB Memory Status"
echo "==============================="
echo "  PID        : $PID"
echo "  Physical   : $(format_bytes $RSS_BYTES)"
echo "  Virtual    : $(format_bytes $VMS_BYTES)"
echo "==============================="
