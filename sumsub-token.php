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
$SUMSUB_APP_TOKEN  = 'sbx:syTel0NAQB0wcirvod05xTQZ.HkwR5Yeu7RGFHhjBBGn7uZzpooEmVzxM'; // Replace with your real token

$url = "https://api.sumsub.com/resources/accessTokens/sdk";
$body = json_encode([
    'applicantIdentifiers' => [
        'email' => $email,
        'phone' => $phone
    ],
    'ttlInSecs' => 600,
    'userId' => $externalUserId,
    'levelName' => $levelName,
    'externalActionId' => $externalUserId
]);

$opts = [
    'http' => [
        'method'  => 'POST',
        'header'  => "X-App-Token: $SUMSUB_APP_TOKEN\r\n" .
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
