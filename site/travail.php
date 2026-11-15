<?php
$id = $_GET["id"] ?? "";

if (!is_string($id)) {
    $id = "";
}
if (!preg_match('/^[a-z0-9-]{1,30}$/', $id)) {
    http_response_code(404);
    include __DIR__ . "/404.php";
    exit;
}

$titre = "Travail";
include __DIR__ . "/includes/entete.php";
?>

<div id="app" data-travail-id="<?= htmlspecialchars($id) ?>"></div>
<script type="module" src="js/travail.js"></script>

<?php include __DIR__ . "/includes/pied.php"; ?>