#!/usr/bin/env bash
# Compile and run SBL's Monkey C unit tests using the Garmin SDK.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "${1:-}" == "--help" ]]; then
    echo 'Usage: bash scripts/test-sbl.sh [device ...]'
    echo 'Defaults to edge1040. Starts the Garmin simulator automatically.'
    echo 'Set CIQ_SDK to the SDK directory (auto-detected on macOS). Java must be on PATH.'
    exit 0
fi
SDK="${CIQ_SDK:-}"
if [[ -z "$SDK" && -f "$HOME/Library/Application Support/Garmin/ConnectIQ/current-sdk.cfg" ]]; then
    SDK="$(cat "$HOME/Library/Application Support/Garmin/ConnectIQ/current-sdk.cfg")"
fi
if [[ -z "$SDK" || ! -f "$SDK/bin/monkeyc" ]]; then
    echo 'Set CIQ_SDK to your installed Garmin Connect IQ SDK directory.' >&2
    exit 1
fi
if [[ $# -eq 0 ]]; then set -- edge1040; fi
cd "$ROOT/Source/SmartBikeLights"
for device in "$@"; do
    case "$device" in
        edge1050|edge850|edge550|edge1040|edge840|edge540|fr965) ;;
        *) echo "Unsupported device: $device" >&2; exit 1 ;;
    esac
done
simulator_started=false
for device in "$@"; do
    output="$ROOT/Build/unit-tests/$device"
    mkdir -p "$output"
    bash "$SDK/bin/monkeyc" -f monkey.jungle -d "$device" -y unit_test_key \
        -o "$output/SmartBikeLights-tests.prg" --unit-test -w
    if [[ "$simulator_started" == false ]]; then
        echo 'Starting Garmin simulator...'
        bash "$SDK/bin/connectiq" > "$output/simulator-start.log" 2>&1 &
        simulator_started=true
        sleep 3
    fi
    # SDK 9.2 can block when transfer progress fills its subprocess pipe.
    # Use the same workaround as Simulator/common/run.py.
    export SBL_TEST_SDK="$SDK" SBL_TEST_OUTPUT="$output"
    cat > "$output/simulator-shell" <<'SHELL'
#!/usr/bin/env bash
for arg in "$@"; do
    if [[ "$arg" == push ]]; then
        exec "$SBL_TEST_SDK/bin/shell" "$@" >> "$SBL_TEST_OUTPUT/simulator-transfer.log" 2>&1
    fi
done
exec "$SBL_TEST_SDK/bin/shell" "$@"
SHELL
    chmod +x "$output/simulator-shell"
    # Retry only connection failures while the simulator is starting.
    for attempt in {1..10}; do
        status=0
        java -classpath "$SDK/bin/monkeybrains.jar" \
            com.garmin.monkeybrains.monkeydodeux.MonkeyDoDeux \
            -f "$output/SmartBikeLights-tests.prg" -d "$device" \
            -s "$output/simulator-shell" -t \
            > "$output/test-results.log" 2>&1 || status=$?
        if grep -q 'Unable to connect to simulator' "$output/test-results.log" && [[ "$attempt" -lt 10 ]]; then
            sleep 2
            continue
        fi
        cat "$output/test-results.log"
        # Some SDK versions return 1 even when every unit test passes.
        # Require Garmin's completed success summary, not just an exit code.
        if grep -Eq '^PASSED \(passed=[1-9][0-9]*, failed=0, errors=0\)' "$output/test-results.log"; then
            break
        fi
        if [[ "$status" -ne 0 ]]; then exit "$status"; fi
        echo 'Garmin did not report a successful completed test run.' >&2
        exit 1
    done
done
