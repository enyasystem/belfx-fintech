<?php
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}
$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['externalUserId'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing externalUserId']);
    exit;
}

// Set your Sumsub credentials here or use environment variables if supported
$SUMSUB_SECRET_KEY = 'sbx:m8VVPW4mq2RcgssY2j355jLR.c5JRgFyzJWyQ7lDFKcaWQxkXENH3sYO6';
$SUMSUB_APP_TOKEN = '5l1BEq5EhCikpQ9mZ9mW4IQhdMgEa0Ns';

if (!$SUMSUB_SECRET_KEY || !$SUMSUB_APP_TOKEN) {
    http_response_code(500);
    echo json_encode(['error' => 'Sumsub credentials not set']);
    exit;
}

$externalUserId = $input['externalUserId'];
$ts = time();
$method = 'POST';
$path = '/resources/accessTokens?userId=' . $externalUserId;
$signature = hash_hmac('sha256', $ts . "\n" . $method . "\n" . $path . "\n", $SUMSUB_SECRET_KEY);

$url = "https://api.sumsub.com/resources/accessTokens?userId=$externalUserId";

$opts = [
    'http' => [
        'method' => 'POST',
        'header' => "X-App-Token: $SUMSUB_APP_TOKEN\r\n" .
                    "X-App-Access-Sig: $signature\r\n" .
                    "X-App-Access-Ts: $ts\r\n" .
                    "Content-Type: application/json\r\n",
        'content' => '',
        'ignore_errors' => true
    ]
];
$context = stream_context_create($opts);
$response = file_get_contents($url, false, $context);
$status_line = $http_response_header[0];
preg_match('{HTTP\/\S*\s(\d{3})}', $status_line, $match);
$status = $match[1];

if ($status != 200) {
    http_response_code($status);
    echo $response;
    exit;
}
echo $response;
?>
