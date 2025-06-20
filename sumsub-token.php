<?php
header('Content-Type: application/json');

// Show info for GET requests
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'message' => 'KwegoFX KYC Token Endpoint',
        'usage' => 'Send a POST request with JSON body: { "externalUserId": "user123", "email": "user@email.com", "phone": "1234567890", "levelName": "basic" }'
    ]);
    exit;
}

// Only allow POST for token generation
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// Decode incoming JSON
$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['externalUserId']) || !isset($input['email']) || !isset($input['phone']) || !isset($input['levelName'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: externalUserId, email, phone, levelName']);
    exit;
}

$externalUserId = $input['externalUserId'];
$email = $input['email'];
$phone = $input['phone'];
$levelName = $input['levelName'];

// Sumsub credentials
$SUMSUB_APP_TOKEN  = 'sbx:m8VVPW4mq2RcgssY2j355jLR.c5JRgFyzJWyQ7lDFKcaWQxkXENH3sYO6'; // Replace with your real token
$SUMSUB_SECRET_KEY = '5l1BEq5EhCikpQ9mZ9mW4IQhdMgEa0Ns'; // NOT the app token

$url = "https://api.sumsub.com/resources/accessTokens/sdk";
$bodyArray = [
    'applicantIdentifiers' => [
        'email' => $email,
        'phone' => $phone
    ],
    'ttlInSecs' => 600,
    'userId' => $externalUserId,
    'levelName' => $levelName,
    'externalActionId' => $externalUserId
];
$body = json_encode($bodyArray, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

$ts = time();
$method = 'POST';
$path = '/resources/accessTokens/sdk';
$stringToSign = $ts . "\n" . $method . "\n" . $path . "\n" . $body;
$signature = hash_hmac('sha256', $stringToSign, $SUMSUB_SECRET_KEY);

// Debug output
error_log('String to sign: ' . $stringToSign);
error_log('Signature: ' . $signature);
error_log('Body: ' . $body);

$opts = [
    'http' => [
        'method'  => 'POST',
        'header'  => "X-App-Token: $SUMSUB_APP_TOKEN\r\n" .
                     "X-App-Access-Sig: $signature\r\n" .
                     "X-App-Access-Ts: $ts\r\n" .
                     "Content-Type: application/json\r\n",
        'content' => $body,
        'ignore_errors' => true
    ]
];

$context = stream_context_create($opts);
$response = file_get_contents($url, false, $context);

// Get HTTP status
$status_line = $http_response_header[0] ?? '';
preg_match('{HTTP/\S*\s(\d{3})}', $status_line, $match);
$status = $match[1] ?? 500;

http_response_code($status);
echo $response;
?>
