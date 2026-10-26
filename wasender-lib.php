<?php
declare(strict_types=1);

/**
 * Shared WasenderApi helpers for Laragon + LMS project.
 */

function resolveWasenderEnv(): array
{
    // backend/.env is the canonical key used by the Node LMS app.
    $candidates = [
        __DIR__ . '/.env',
        'F:/coding/LMS/lms-cursor/backend/.env',
        __DIR__ . '/backend/.env',
        'F:/coding/LMS/lms-cursor/.env',
    ];

    $fallback = null;

    foreach ($candidates as $path) {
        if (!is_readable($path)) {
            continue;
        }

        $env = loadEnvFile($path);
        $apiKey = sanitizeWasenderApiKey($env['WASENDER_API_KEY'] ?? '');
        if ($apiKey === '') {
            continue;
        }

        $config = [
            'path' => $path,
            'api_key' => $apiKey,
            'base_url' => rtrim($env['WASENDER_API_BASE_URL'] ?? 'https://www.wasenderapi.com', '/'),
            'country_code' => $env['WHATSAPP_DEFAULT_COUNTRY_CODE'] ?? '92',
            'auth_style' => 'bearer',
        ];

        try {
            $validation = validateWasenderApiKey($apiKey, $config['base_url']);
            if ($validation['valid']) {
                $config['auth_style'] = $validation['auth_style'];
                $config['validated'] = true;
                $config['status'] = $validation['status'];
                return $config;
            }
        } catch (Throwable) {
            // Try the next env file.
        }

        if ($fallback === null) {
            $config['validated'] = false;
            $config['status'] = null;
            $fallback = $config;
        }
    }

    if ($fallback !== null) {
        return $fallback;
    }

    return [
        'path' => null,
        'api_key' => '',
        'base_url' => 'https://www.wasenderapi.com',
        'country_code' => '92',
        'auth_style' => 'bearer',
        'validated' => false,
        'status' => null,
    ];
}

function loadEnvFile(string $path): array
{
    $contents = file_get_contents($path);
    if ($contents === false) {
        return [];
    }

    // Strip UTF-8 BOM if present.
    $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents) ?? $contents;

    $vars = [];
    foreach (preg_split('/\R/', $contents) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (!str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        // Remove inline comments for unquoted values.
        if ($value !== '' && !str_starts_with($value, '"') && !str_starts_with($value, "'")) {
            $hashPos = strpos($value, ' #');
            if ($hashPos !== false) {
                $value = substr($value, 0, $hashPos);
            }
        }

        $vars[$key] = trim($value, " \t\n\r\0\x0B\"'");
    }

    return $vars;
}

function sanitizeWasenderApiKey(string $raw): string
{
    $key = trim($raw);
    $key = preg_replace('/^\xEF\xBB\xBF/', '', $key) ?? $key;

    if (preg_match('/^Bearer\s+token\s+/i', $key)) {
        $key = preg_replace('/^Bearer\s+token\s+/i', '', $key);
    } elseif (preg_match('/^Bearer\s+/i', $key)) {
        $key = preg_replace('/^Bearer\s+/i', '', $key);
    }

    return trim($key, " \t\n\r\0\x0B\"'");
}

function buildWasenderAuthorization(string $apiKey, string $style): string
{
    return $style === 'bearer_token'
        ? 'Bearer token ' . $apiKey
        : 'Bearer ' . $apiKey;
}

function wasenderApiRequest(
    string $method,
    string $baseUrl,
    string $apiKey,
    string $authStyle,
    string $endpoint,
    ?array $body = null
): array {
    $url = rtrim($baseUrl, '/') . $endpoint;
    $headers = [
        'Authorization: ' . buildWasenderAuthorization($apiKey, $authStyle),
        'Accept: application/json',
    ];

    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Could not initialize cURL.');
    }

    $options = [
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
    ];

    if ($body !== null) {
        $payload = json_encode($body, JSON_THROW_ON_ERROR);
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_HTTPHEADER] = $headers;
        $options[CURLOPT_POSTFIELDS] = $payload;
    }

    curl_setopt_array($ch, $options);

    $responseBody = curl_exec($ch);
    $curlError = curl_error($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($responseBody === false) {
        throw new RuntimeException('Request failed: ' . $curlError);
    }

    $decoded = json_decode($responseBody, true);

    return [
        'http_code' => $statusCode,
        'body' => is_array($decoded) ? $decoded : ['raw' => $responseBody],
        'raw' => $responseBody,
    ];
}

function isWasenderAuthFailure(array $response): bool
{
    if ($response['http_code'] === 401 || $response['http_code'] === 403) {
        return true;
    }

    $message = strtolower((string) ($response['body']['message'] ?? ''));
    return str_contains($message, 'invalid api key')
        || str_contains($message, 'api key is required')
        || str_contains($message, 'unauthorized');
}

function validateWasenderApiKey(string $apiKey, string $baseUrl): array
{
    $styles = ['bearer', 'bearer_token'];

    foreach ($styles as $style) {
        $response = wasenderApiRequest('GET', $baseUrl, $apiKey, $style, '/api/status');

        if (isWasenderAuthFailure($response)) {
            continue;
        }

        if ($response['http_code'] >= 200 && $response['http_code'] < 300) {
            return [
                'valid' => true,
                'auth_style' => $style,
                'status' => $response['body'],
            ];
        }

        if (($response['body']['success'] ?? null) === true) {
            return [
                'valid' => true,
                'auth_style' => $style,
                'status' => $response['body'],
            ];
        }
    }

    return [
        'valid' => false,
        'auth_style' => 'bearer',
        'status' => null,
        'message' => 'Invalid API key. Copy the session API key from WasenderApi → Session Management (not the Personal Access Token).',
    ];
}

function normalizePhoneForWhatsApp(string $phone, string $defaultCountryCode = '92'): ?string
{
    $trimmed = trim($phone);
    if ($trimmed === '') {
        return null;
    }

    if (str_starts_with($trimmed, '+')) {
        $digits = preg_replace('/\D/', '', substr($trimmed, 1));
        return strlen($digits) >= 10 ? '+' . $digits : null;
    }

    $digits = preg_replace('/\D/', '', $trimmed);
    if ($digits === '') {
        return null;
    }

    if (strlen($digits) >= 11 && str_starts_with($digits, $defaultCountryCode)) {
        return '+' . $digits;
    }

    if (str_starts_with($digits, '0')) {
        return '+' . $defaultCountryCode . substr($digits, 1);
    }

    return '+' . $defaultCountryCode . $digits;
}

function formatWasenderRecipient(string $to): string
{
    return ltrim($to, '+');
}

function sendWasenderMessage(
    string $apiKey,
    string $baseUrl,
    string $authStyle,
    string $to,
    string $text
): array {
    $response = wasenderApiRequest('POST', $baseUrl, $apiKey, $authStyle, '/api/send-message', [
        'to' => formatWasenderRecipient($to),
        'text' => $text,
    ]);

    if (isWasenderAuthFailure($response)) {
        throw new RuntimeException('Invalid API key. Update WASENDER_API_KEY in backend/.env from your Wasender session page.');
    }

    if ($response['http_code'] < 200 || $response['http_code'] >= 300) {
        $detail = $response['body']['message'] ?? $response['body']['error'] ?? $response['raw'];
        throw new RuntimeException("WasenderApi error ({$response['http_code']}): {$detail}");
    }

    return $response['body'];
}

function maskWasenderApiKey(string $apiKey): string
{
    if (strlen($apiKey) <= 8) {
        return '********';
    }

    return substr($apiKey, 0, 6) . '...' . substr($apiKey, -4);
}

function extractSessionStatusLabel(?array $statusPayload): string
{
    if ($statusPayload === null) {
        return 'unknown';
    }

    foreach (['status', 'session_status', 'connection_status'] as $field) {
        if (!empty($statusPayload[$field]) && is_string($statusPayload[$field])) {
            return $statusPayload[$field];
        }
        if (!empty($statusPayload['data'][$field]) && is_string($statusPayload['data'][$field])) {
            return $statusPayload['data'][$field];
        }
    }

    return 'connected';
}
