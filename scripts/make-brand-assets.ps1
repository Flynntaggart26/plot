# Plot marka görsellerini üretir: koyu zemin + amber "plot çizgisi".
# Kullanım: powershell -ExecutionPolicy Bypass -File scripts/make-brand-assets.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'

function New-BrandMark {
    param(
        [int]$Size,
        [string]$Background,
        [string]$LineColor,
        [double]$Scale,
        [string]$Path
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($Background -eq 'transparent') {
        $graphics.Clear([System.Drawing.Color]::Transparent)
    } else {
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($Background))
    }

    $center = $Size / 2.0
    $unit = $Size / 1024.0
    $base = @(
        [System.Drawing.PointF]::new(262, 712),
        [System.Drawing.PointF]::new(458, 542),
        [System.Drawing.PointF]::new(632, 612),
        [System.Drawing.PointF]::new(782, 352)
    )

    [System.Drawing.PointF[]]$points = $base | ForEach-Object {
        [System.Drawing.PointF]::new(
            [float]($center + ($_.X - 512) * $Scale * $unit),
            [float]($center + ($_.Y - 512) * $Scale * $unit)
        )
    }

    $pen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($LineColor), [float](36 * $Scale * $unit))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawLines($pen, $points)

    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($LineColor))
    foreach ($index in 1, 3) {
        $dot = 30 * $Scale * $unit
        $graphics.FillEllipse(
            $brush,
            [float]($points[$index].X - $dot),
            [float]($points[$index].Y - $dot),
            [float]($dot * 2),
            [float]($dot * 2)
        )
    }

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $brush.Dispose()
    $pen.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

function New-SolidImage {
    param([int]$Size, [string]$Background, [string]$Path)
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($Background))
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

New-BrandMark -Size 1024 -Background '#0E0E10' -LineColor '#E8A33D' -Scale 1.0 -Path (Join-Path $assets 'icon.png')
New-BrandMark -Size 1024 -Background 'transparent' -LineColor '#E8A33D' -Scale 0.62 -Path (Join-Path $assets 'android-icon-foreground.png')
New-BrandMark -Size 1024 -Background 'transparent' -LineColor '#FFFFFF' -Scale 0.62 -Path (Join-Path $assets 'android-icon-monochrome.png')
New-BrandMark -Size 1024 -Background 'transparent' -LineColor '#E8A33D' -Scale 0.72 -Path (Join-Path $assets 'splash-icon.png')
New-SolidImage -Size 1024 -Background '#0E0E10' -Path (Join-Path $assets 'android-icon-background.png')
New-BrandMark -Size 64 -Background '#0E0E10' -LineColor '#E8A33D' -Scale 1.0 -Path (Join-Path $assets 'favicon.png')

Write-Output 'brand assets written'
