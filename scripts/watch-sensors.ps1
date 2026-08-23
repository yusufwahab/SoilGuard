# Watch live SoilGuard ESP32 sensor readings directly from the terminal.
# Polls the ESP32's local HTTP server (no Firebase, no internet) every 3s
# and reprints the latest values -- proof the numbers are coming straight
# from the hardware, not a cached/mock value.
#
# Usage:
#   .\scripts\watch-sensors.ps1 -EspIp 192.168.1.55
#
# Find the IP from the ESP32's Serial Monitor line:
#   "📶 Local IP Address: ..."

param(
    [string]$EspIp = "192.168.1.42"
)

Write-Host "Watching SoilGuard ESP32 at http://$EspIp (Ctrl+C to stop)`n"

while ($true) {
    try {
        $data = Invoke-RestMethod -Uri "http://$EspIp/api/sensor" -TimeoutSec 5
        Clear-Host
        Write-Host "SoilGuard Live Readings -- $(Get-Date -Format 'HH:mm:ss')`n" -ForegroundColor Cyan
        foreach ($crop in @("rice", "beans", "yam")) {
            $c = $data.$crop
            $pump = if ($c.pumpStatus -eq 1) { "ON" } else { "OFF" }
            $pumpColor = if ($c.pumpStatus -eq 1) { "Green" } else { "DarkGray" }
            Write-Host ("{0,-6}" -f $crop.ToUpper()) -NoNewline -ForegroundColor White
            Write-Host (" Temp: {0,5}C   Humidity: {1,5}%   Moisture: {2,4}%   Pump: " -f $c.temperature, $c.humidity, $c.moisture) -NoNewline
            Write-Host $pump -ForegroundColor $pumpColor
        }
    } catch {
        Write-Host "Can't reach ESP32 at $EspIp -- check it's powered on and you're on the same Wi-Fi." -ForegroundColor Red
    }
    Start-Sleep -Seconds 3
}
