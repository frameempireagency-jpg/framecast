Add-Type -AssemblyName System.Drawing

$cream = [System.Drawing.Color]::FromArgb(0xFA, 0xF6, 0xFC)
$brandPurple = [System.Drawing.Color]::FromArgb(0x52, 0x1F, 0x88)
$white = [System.Drawing.Color]::FromArgb(0xEF, 0xE9, 0xF8)

function Draw-FMark {
	param($g, $color, [float]$cx, [float]$cy, [float]$size)
	# F path in 80x80 coords: M22 18 H58 V28 H34 V37 H50 V46 H34 V64 H22 Z
	# centered on the viewbox: F center is at (40, 41). Shift so (cx, cy) maps to that.
	[float]$scale = $size / 80.0
	[float]$ox = $cx - 40.0 * $scale
	[float]$oy = $cy - 41.0 * $scale
	$pts = @(
		@(22, 18), @(58, 18), @(58, 28), @(34, 28),
		@(34, 37), @(50, 37), @(50, 46), @(34, 46),
		@(34, 64), @(22, 64)
	)
	$path = New-Object System.Drawing.Drawing2D.GraphicsPath
	[System.Drawing.PointF[]]$pfs = @()
	foreach ($p in $pts) {
		$pfs += (New-Object System.Drawing.PointF(($ox + [float]$p[0] * $scale), ($oy + [float]$p[1] * $scale)))
	}
	$path.AddPolygon($pfs)
	$brush = New-Object System.Drawing.SolidBrush($color)
	$g.FillPath($brush, $path)
	$brush.Dispose()
	$path.Dispose()
}

$base = "C:\Users\A3HHH\AppData\Local\Temp\claude\C--Users-A3HHH\ec8d09a9-739d-4d08-9664-26aa710ed86c\scratchpad\bmps-out"
New-Item -ItemType Directory -Force -Path $base | Out-Null

# wix-banner 493x58: cream 0-450, transition 450-465, purple 465-493 (28px slim accent)
$bmp = New-Object System.Drawing.Bitmap(493, 58)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$creamBrush = New-Object System.Drawing.SolidBrush($cream)
$g.FillRectangle($creamBrush, 0, 0, 493, 58)
$purpleBrush = New-Object System.Drawing.SolidBrush($brandPurple)
$g.FillRectangle($purpleBrush, 465, 0, 28, 58)
$transRect = New-Object System.Drawing.Rectangle(450, 0, 15, 58)
$transGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($transRect, $cream, $brandPurple, 0.0)
$g.FillRectangle($transGrad, $transRect)
Draw-FMark $g $white 479.0 29.0 24.0
$bmp.Save("$base\wix-banner.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$g.Dispose(); $bmp.Dispose(); $creamBrush.Dispose(); $purpleBrush.Dispose(); $transGrad.Dispose()
Write-Output "Wrote wix-banner.bmp (493x58)"

# nsis-header 150x57: cream 0-122, transition 122-130, purple 130-150 (20px slim accent)
$bmp = New-Object System.Drawing.Bitmap(150, 57)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$creamBrush = New-Object System.Drawing.SolidBrush($cream)
$g.FillRectangle($creamBrush, 0, 0, 150, 57)
$purpleBrush = New-Object System.Drawing.SolidBrush($brandPurple)
$g.FillRectangle($purpleBrush, 130, 0, 20, 57)
$transRect = New-Object System.Drawing.Rectangle(122, 0, 8, 57)
$transGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush($transRect, $cream, $brandPurple, 0.0)
$g.FillRectangle($transGrad, $transRect)
Draw-FMark $g $white 140.0 28.5 20.0
$bmp.Save("$base\nsis-header.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$g.Dispose(); $bmp.Dispose(); $creamBrush.Dispose(); $purpleBrush.Dispose(); $transGrad.Dispose()
Write-Output "Wrote nsis-header.bmp (150x57)"

function New-Dialog {
	param([string]$OutPath, [int]$Width, [int]$Height, [single]$fMarkCy, [single]$wordmarkCy, [single]$taglineCy1, [single]$taglineCy2, [int]$wordmarkSize, [single]$fMarkSize, [int]$taglineSize)
	$bmp = New-Object System.Drawing.Bitmap($Width, $Height)
	$g = [System.Drawing.Graphics]::FromImage($bmp)
	$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
	$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
	$creamBrush = New-Object System.Drawing.SolidBrush($cream)
	$g.FillRectangle($creamBrush, 0, 0, $Width, $Height)
	$leftW = 164
	$purpleBrush = New-Object System.Drawing.SolidBrush($brandPurple)
	$g.FillRectangle($purpleBrush, 0, 0, $leftW, $Height)
	[single]$cx = $leftW / 2.0
	Draw-FMark $g $white $cx $fMarkCy $fMarkSize
	$whiteBrush = New-Object System.Drawing.SolidBrush($white)
	$wmFont = New-Object System.Drawing.Font("Segoe UI", $wordmarkSize, [System.Drawing.FontStyle]::Bold)
	$wmFmt = New-Object System.Drawing.StringFormat
	$wmFmt.Alignment = [System.Drawing.StringAlignment]::Center
	$g.DrawString("FrameCast", $wmFont, $whiteBrush, $cx, $wordmarkCy, $wmFmt)
	$tFont = New-Object System.Drawing.Font("Segoe UI Semilight", $taglineSize)
	$tBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 0xEF, 0xE9, 0xF8))
	$g.DrawString("Record. Share.", $tFont, $tBrush, $cx, $taglineCy1, $wmFmt)
	$g.DrawString("Move on.", $tFont, $tBrush, $cx, $taglineCy2, $wmFmt)
	$bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
	$g.Dispose(); $bmp.Dispose(); $creamBrush.Dispose(); $purpleBrush.Dispose(); $whiteBrush.Dispose(); $wmFont.Dispose(); $tFont.Dispose(); $tBrush.Dispose()
	Write-Output "Wrote $OutPath"
}

New-Dialog -OutPath "$base\wix-dialog.bmp" -Width 493 -Height 312 -fMarkCy 100.0 -wordmarkCy 165.0 -taglineCy1 200.0 -taglineCy2 216.0 -wordmarkSize 22 -fMarkSize 72.0 -taglineSize 9

$bmp = New-Object System.Drawing.Bitmap(164, 314, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$purpleBrush = New-Object System.Drawing.SolidBrush($brandPurple)
$g.FillRectangle($purpleBrush, 0, 0, 164, 314)
Draw-FMark $g $white 82.0 107.0 72.0
$whiteBrush = New-Object System.Drawing.SolidBrush($white)
$wmFont = New-Object System.Drawing.Font("Segoe UI", 19, [System.Drawing.FontStyle]::Bold)
$wmFmt = New-Object System.Drawing.StringFormat
$wmFmt.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("FrameCast", $wmFont, $whiteBrush, [single]82.0, [single]168.0, $wmFmt)
$tFont = New-Object System.Drawing.Font("Segoe UI Semilight", 8)
$tBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170, 0xEF, 0xE9, 0xF8))
$g.DrawString("Record. Share.", $tFont, $tBrush, [single]82.0, [single]204.0, $wmFmt)
$g.DrawString("Move on.", $tFont, $tBrush, [single]82.0, [single]220.0, $wmFmt)
$g.Dispose()
$bmp.Save("$base\nsis-sidebar.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$bmp.Dispose(); $purpleBrush.Dispose(); $whiteBrush.Dispose(); $wmFont.Dispose(); $tFont.Dispose(); $tBrush.Dispose()
Write-Output "Wrote nsis-sidebar.bmp (164x314)"
