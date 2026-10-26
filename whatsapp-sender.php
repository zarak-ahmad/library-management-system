<?php
declare(strict_types=1);

require __DIR__ . '/wasender-lib.php';

$config = resolveWasenderEnv();
$apiKey = $config['api_key'];
$baseUrl = $config['base_url'];
$countryCode = $config['country_code'];
$envPath = $config['path'];

$error = '';
$success = '';
$responsePreview = '';
$phoneValue = '';
$textValue = '';
$apiValidation = ['valid' => false, 'auth_style' => 'bearer', 'status' => null, 'message' => ''];
$sessionStatus = '';

if ($apiKey !== '') {
    try {
        $apiValidation = validateWasenderApiKey($apiKey, $baseUrl);
        if ($apiValidation['valid']) {
            $sessionStatus = extractSessionStatusLabel($apiValidation['status']);
        }
    } catch (Throwable $e) {
        $apiValidation = [
            'valid' => false,
            'auth_style' => 'bearer',
            'status' => null,
            'message' => $e->getMessage(),
        ];
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $phoneValue = trim((string) ($_POST['phone'] ?? ''));
    $textValue = trim((string) ($_POST['text'] ?? ''));

    if ($apiKey === '') {
        $error = 'WASENDER_API_KEY not found in backend/.env or project .env.';
    } elseif (!$apiValidation['valid']) {
        $error = $apiValidation['message'] ?? 'API key validation failed.';
    } elseif ($phoneValue === '' || $textValue === '') {
        $error = 'Please enter both a phone number and a message.';
    } else {
        $normalized = normalizePhoneForWhatsApp($phoneValue, $countryCode);
        if ($normalized === null) {
            $error = 'Invalid phone number. Use +923001234567 or 03001234567.';
        } else {
            try {
                $result = sendWasenderMessage(
                    $apiKey,
                    $baseUrl,
                    $apiValidation['auth_style'],
                    $normalized,
                    $textValue
                );
                $success = 'Message sent to ' . htmlspecialchars(formatWasenderRecipient($normalized), ENT_QUOTES, 'UTF-8') . '.';
                $responsePreview = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            } catch (Throwable $e) {
                $error = $e->getMessage();
            }
        }
    }
}

$apiReady = $apiKey !== '' && $apiValidation['valid'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Sender — WasenderApi</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .card { width: 100%; max-width: 520px; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; }
        h1 { margin: 0 0 6px; font-size: 1.4rem; }
        .subtitle { margin: 0 0 20px; color: #94a3b8; font-size: 0.9rem; }
        label { display: block; margin-bottom: 6px; font-size: 0.85rem; }
        input, textarea { width: 100%; margin-bottom: 16px; padding: 12px 14px; border-radius: 10px; border: 1px solid #475569; background: #0f172a; color: #f1f5f9; font: inherit; }
        textarea { min-height: 120px; }
        button { width: 100%; padding: 13px; border: none; border-radius: 10px; background: #22c55e; color: #052e16; font-weight: 700; cursor: pointer; }
        button:disabled { opacity: 0.5; }
        .alert { margin-bottom: 16px; padding: 12px 14px; border-radius: 10px; font-size: 0.9rem; }
        .alert.error { background: #450a0a; border: 1px solid #b91c1c; color: #fecaca; }
        .alert.success { background: #052e16; border: 1px solid #16a34a; color: #bbf7d0; }
        .alert.warn { background: #422006; border: 1px solid #d97706; color: #fde68a; }
        .alert.info { background: #0c4a6e; border: 1px solid #0284c7; color: #bae6fd; }
        pre { margin: 12px 0 0; padding: 12px; background: #0f172a; border-radius: 8px; font-size: 0.75rem; color: #94a3b8; overflow-x: auto; }
        .hint, .meta { font-size: 0.8rem; color: #64748b; }
        .meta { margin-bottom: 16px; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="card">
        <h1>WhatsApp Sender</h1>
        <p class="subtitle">WasenderApi test form</p>

        <?php if ($envPath): ?>
            <p class="meta">Config: <code><?= htmlspecialchars(basename(dirname($envPath)) . '/' . basename($envPath), ENT_QUOTES, 'UTF-8') ?></code></p>
        <?php endif; ?>

        <?php if ($apiKey === ''): ?>
            <div class="alert warn">Add WASENDER_API_KEY to backend/.env</div>
        <?php elseif (!$apiValidation['valid']): ?>
            <div class="alert error"><?= htmlspecialchars($apiValidation['message'] ?? 'Invalid API key.', ENT_QUOTES, 'UTF-8') ?></div>
        <?php else: ?>
            <div class="alert success">API key OK · session: <?= htmlspecialchars($sessionStatus, ENT_QUOTES, 'UTF-8') ?></div>
        <?php endif; ?>

        <?php if ($error !== ''): ?><div class="alert error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
        <?php if ($success !== ''): ?><div class="alert success"><?= $success ?></div><?php endif; ?>
        <?php if ($responsePreview !== ''): ?><pre><?= htmlspecialchars($responsePreview, ENT_QUOTES, 'UTF-8') ?></pre><?php endif; ?>

        <form method="post">
            <label for="phone">Phone number</label>
            <input type="text" id="phone" name="phone" placeholder="03001234567" value="<?= htmlspecialchars($phoneValue, ENT_QUOTES, 'UTF-8') ?>" required>
            <p class="hint">Country code: <?= htmlspecialchars($countryCode, ENT_QUOTES, 'UTF-8') ?></p>
            <label for="text">Message</label>
            <textarea id="text" name="text" required><?= htmlspecialchars($textValue, ENT_QUOTES, 'UTF-8') ?></textarea>
            <button type="submit" <?= $apiReady ? '' : 'disabled' ?>>Send WhatsApp Message</button>
        </form>
    </div>
</body>
</html>
