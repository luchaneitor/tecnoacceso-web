<?php
include 'db.php';
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$alerta_id = $data['id'];

$sql = "UPDATE alertas SET leida = 1 WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $alerta_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "error" => $conn->error]);
}

$conn->close();
?>