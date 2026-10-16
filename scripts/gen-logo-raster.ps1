Add-Type -AssemblyName System.Drawing

$brandPurple = [System.Drawing.Color]::FromArgb(0x52, 0x1F, 0x88)
$cream = [System.Drawing.Color]::FromArgb(0xEF, 0xE9, 0xF8)

function Draw-Icon {
	param(
		[int]$Size,
		[string]$OutPath,
		[bool]$Transparent = $false,
		[System.Drawing.Color]$FillColor = $cream,
		[bool]$NoBackground = $false
	)
	$bmp = New-Object System.Drawing.Bitmap($Size, $Size)
	$g = [System.Drawing.Graphics]::FromImage($bmp)
	$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
	$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
	$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

	if ($Transparent) {
		$g.Clear([System.Drawing.Color]::Transparent)
	} else {
		$g.Clear($cream)
	}

	[float]$s = [float]$Size

	if (-not $NoBackground) {
		[float]$rx = 18.0 * $s / 80.0
		$path = New-Object System.Drawing.Drawing2D.GraphicsPath
		[float]$d = $rx * 2.0
		$path.AddArc(0.0, 0.0, $d, $d, 180.0, 90.0)
		$path.AddArc(($s - $d), 0.0, $d, $d, 270.0, 90.0)
		$path.AddArc(($s - $d), ($s - $d), $d, $d, 0.0, 90.0)
		$path.AddArc(0.0, ($s - $d), $d, $d, 90.0, 90.0)
		$path.CloseFigure()
		$brush = New-Object System.Drawing.SolidBrush($brandPurple)
		$g.FillPath($brush, $path)
		$brush.Dispose()
		$path.Dispose()
	}

	$pts = @(
		@(22, 18), @(58, 18), @(58, 28), @(34, 28),
		@(34, 37), @(50, 37), @(50, 46), @(34, 46),
		@(34, 64), @(22, 64)
	)
	$gpath = New-Object System.Drawing.Drawing2D.GraphicsPath
	[System.Drawing.PointF[]]$pfs = @()
	foreach ($p in $pts) {
		$pfs += (New-Object System.Drawing.PointF(([float]$p[0] * $s / 80.0), ([float]$p[1] * $s / 80.0)))
	}
	$gpath.AddPolygon($pfs)

	$fbrush = New-Object System.Drawing.SolidBrush($FillColor)
	$g.FillPath($fbrush, $gpath)
	$fbrush.Dispose()
	$gpath.Dispose()

	$bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
	$g.Dispose()
	$bmp.Dispose()
	Write-Host "Wrote $OutPath ($Size x $Size)"
}

$outDir = "$PSScriptRoot\..\apps\desktop\src-tauri\icons"
$masterDir = "$PSScriptRoot\..\target\logo"
$webDir = "$PSScriptRoot\..\apps\web\public"
New-Item -ItemType Directory -Force -Path $masterDir | Out-Null

Draw-Icon -Size 1024 -OutPath "$masterDir\master-1024.png"

Draw-Icon -Size 32 -OutPath "$outDir\tray-default-icon.png" -Transparent $true -FillColor $cream -NoBackground $true
Draw-Icon -Size 32 -OutPath "$outDir\tray-default-icon-instant.png" -Transparent $true -FillColor $cream -NoBackground $true
Draw-Icon -Size 32 -OutPath "$outDir\tray-default-icon-screenshot.png" -Transparent $true -FillColor $cream -NoBackground $true
Draw-Icon -Size 32 -OutPath "$outDir\tray-default-icon-studio.png" -Transparent $true -FillColor $cream -NoBackground $true

Draw-Icon -Size 16 -OutPath "$webDir\favicon-16x16.png"
Draw-Icon -Size 32 -OutPath "$webDir\favicon-32x32.png"

Write-Host "Done. Master is $masterDir\master-1024.png"
