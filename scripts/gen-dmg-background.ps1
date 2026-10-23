Add-Type -AssemblyName System.Drawing

$W = 1320; $H = 758
$bg = [System.Drawing.Color]::FromArgb(0xFA, 0xF6, 0xFC)
$purple = [System.Drawing.Color]::FromArgb(0x52, 0x1F, 0x88)
$ink = [System.Drawing.Color]::FromArgb(0x1A, 0x14, 0x1F)
$muted = [System.Drawing.Color]::FromArgb(0x7A, 0x6E, 0x86)
$arrowTint = [System.Drawing.Color]::FromArgb(0xC9, 0xB8, 0xDE)

$bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear($bg)

$pen = New-Object System.Drawing.Pen($arrowTint, 12)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($pen, 540, 290, 742, 290)
$pen.Dispose()
$head = New-Object System.Drawing.Drawing2D.GraphicsPath
$head.AddPolygon([System.Drawing.PointF[]]@(
	(New-Object System.Drawing.PointF(726, 264)),
	(New-Object System.Drawing.PointF(780, 290)),
	(New-Object System.Drawing.PointF(726, 316))))
$hb = New-Object System.Drawing.SolidBrush($arrowTint)
$g.FillPath($hb, $head); $hb.Dispose(); $head.Dispose()

$fmt = [System.Drawing.StringFormat]::GenericTypographic.Clone()
$fmt.FormatFlags = $fmt.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces
$regular = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$bold = New-Object System.Drawing.Font("Segoe UI Semibold", 30, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$small = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$parts = @(
	@("Drag ", $regular, $muted),
	@("FrameCast", $bold, $purple),
	@(" into your ", $regular, $muted),
	@("Applications", $bold, $ink),
	@(" folder", $regular, $muted)
)
[float]$total = 0
foreach ($p in $parts) { $total += $g.MeasureString($p[0], $p[1], 2000, $fmt).Width }
[float]$x = ($W - $total) / 2.0
foreach ($p in $parts) {
	$b = New-Object System.Drawing.SolidBrush($p[2])
	$g.DrawString($p[0], $p[1], $b, $x, 500, $fmt)
	$x += $g.MeasureString($p[0], $p[1], 2000, $fmt).Width
	$b.Dispose()
}

$line2 = "Record. Share. Move on.  " + [char]0x00B7 + "  Needs macOS 13.1 or later"
$w2 = $g.MeasureString($line2, $small, 2000, $fmt).Width
$mb = New-Object System.Drawing.SolidBrush($muted)
$g.DrawString($line2, $small, $mb, (($W - $w2) / 2.0), 560, $fmt)
$mb.Dispose()

$pb = New-Object System.Drawing.SolidBrush($purple)
$g.FillRectangle($pb, 0, ($H - 10), $W, 10)
$pb.Dispose()

$g.Dispose()
$out = Resolve-Path "$PSScriptRoot\..\apps\desktop\src-tauri\assets"
$tmp = Join-Path $env:TEMP "fc-dmg.png"
$bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Copy-Item -Force $tmp "$out\dmg-background.png"
Remove-Item $tmp
Write-Host "Wrote $out\dmg-background.png"
