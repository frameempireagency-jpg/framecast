Add-Type -AssemblyName System.Drawing

$cream = [System.Drawing.Color]::FromArgb(0xFA, 0xF6, 0xFC)
$brandPurple = [System.Drawing.Color]::FromArgb(0x52, 0x1F, 0x88)
$white = [System.Drawing.Color]::FromArgb(0xEF, 0xE9, 0xF8)

$root = Resolve-Path "$PSScriptRoot\.."
$markImage = [System.Drawing.Image]::FromFile("$root\target\logo\installer-mark-96.png")
$base = Join-Path $env:TEMP "framecast-bmps"
New-Item -ItemType Directory -Force -Path $base | Out-Null

function New-Bmp([int]$W, [int]$H) {
	$bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
	$g = [System.Drawing.Graphics]::FromImage($bmp)
	$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
	$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
	$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
	$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
	return @($bmp, $g)
}

function Draw-Mark($g, [float]$cx, [float]$cy, [float]$size) {
	$g.DrawImage($markImage, ($cx - $size / 2.0), ($cy - $size / 2.0), $size, $size)
}

function Save-Bmp($bmp, $g, [string]$Name) {
	$g.Dispose()
	$bmp.Save((Join-Path $base $Name), [System.Drawing.Imaging.ImageFormat]::Bmp)
	$bmp.Dispose()
	Write-Output "Wrote $Name"
}

function Draw-Panel($g, [float]$cx, [float]$markCy, [float]$markSize, [float]$wordCy, [int]$wordSize, [float]$tagCy, [int]$tagSize) {
	Draw-Mark $g $cx $markCy $markSize
	$fmt = New-Object System.Drawing.StringFormat
	$fmt.Alignment = [System.Drawing.StringAlignment]::Center
	$wb = New-Object System.Drawing.SolidBrush($white)
	$wf = New-Object System.Drawing.Font("Segoe UI", $wordSize, [System.Drawing.FontStyle]::Bold)
	$g.DrawString("FrameCast", $wf, $wb, $cx, $wordCy, $fmt)
	$tb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 0xEF, 0xE9, 0xF8))
	$tf = New-Object System.Drawing.Font("Segoe UI Semilight", $tagSize)
	$g.DrawString("Record. Share.", $tf, $tb, $cx, $tagCy, $fmt)
	$g.DrawString("Move on.", $tf, $tb, $cx, ($tagCy + 16), $fmt)
	$wb.Dispose(); $wf.Dispose(); $tb.Dispose(); $tf.Dispose()
}

# WiX top banner 493x58: wizard text sits on the left, so the mark goes on the right.
$c = New-Bmp 493 58; $g = $c[1]
$g.Clear($cream)
$pb = New-Object System.Drawing.SolidBrush($brandPurple)
$g.FillRectangle($pb, 0, 56, 493, 2)
Draw-Mark $g 465 28 40
Save-Bmp $c[0] $g "wix-banner.bmp"

# NSIS header 150x57.
$c = New-Bmp 150 57; $g = $c[1]
$g.Clear($cream)
$g.FillRectangle($pb, 0, 55, 150, 2)
Draw-Mark $g 126 27 38
Save-Bmp $c[0] $g "nsis-header.bmp"

# WiX welcome dialog 493x312: wizard text sits on the right, so the brand panel is the left 164px.
$c = New-Bmp 493 312; $g = $c[1]
$g.Clear($cream)
$g.FillRectangle($pb, 0, 0, 164, 312)
Draw-Panel $g 82 100 80 160 22 200 9
Save-Bmp $c[0] $g "wix-dialog.bmp"

# NSIS sidebar 164x314.
$c = New-Bmp 164 314; $g = $c[1]
$g.Clear($brandPurple)
Draw-Panel $g 82 104 80 164 19 202 8
Save-Bmp $c[0] $g "nsis-sidebar.bmp"

$pb.Dispose()
$markImage.Dispose()
$assets = "$root\apps\desktop\src-tauri\assets"
foreach ($f in @("wix-banner.bmp", "wix-dialog.bmp", "nsis-header.bmp", "nsis-sidebar.bmp")) {
	Copy-Item -Force (Join-Path $base $f) (Join-Path $assets $f)
}
Write-Output "Copied BMPs into $assets"
