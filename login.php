<?php
include 'db.php';

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$username = $data["username"];
$password = md5($data["password"]); // La contraseña se encripta antes de comparar

$sql = "SELECT * FROM usuarios WHERE username='$username' AND password='$password'";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    echo json_encode(["status" => "success", "message" => "Inicio de sesión exitoso"]);
} else {
    echo json_encode(["status" => "error", "message" => "Usuario o contraseña incorrectos"]);
}

$conn->close();
?>
