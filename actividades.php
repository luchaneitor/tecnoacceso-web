<?php
include 'db.php';
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $usuario_id = $data['usuario_id'] ?? NULL;
    $dependencia = $data['dependencia'] ?? 'itsa';
    $accion = $data['accion'] ?? '';
    $comando = $data['comando'] ?? '';
    
    $sql = "INSERT INTO actividades (usuario_id, dependencia, accion, comando) 
            VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isss", $usuario_id, $dependencia, $accion, $comando);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
    } else {
        echo json_encode(["success" => false, "error" => $conn->error]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Obtener actividades para el admin
    $sql = "SELECT a.*, u.nombre as usuario_nombre, u.usuario as usuario_login 
            FROM actividades a 
            LEFT JOIN usuarios u ON a.usuario_id = u.id 
            ORDER BY a.fecha DESC 
            LIMIT 50";
    $result = $conn->query($sql);
    
    $actividades = [];
    while($row = $result->fetch_assoc()) {
        $actividades[] = $row;
    }
    
    echo json_encode($actividades);
}

$conn->close();
?>