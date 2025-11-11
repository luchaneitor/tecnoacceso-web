<?php
include 'db.php';
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $accion = $data['accion'] ?? '';
    $tipo = $data['tipo'] ?? 'sistema';
    $detalles = $data['detalles'] ?? NULL;
    $usuario_id = $data['usuario_id'] ?? NULL;
    $estado = $data['estado'] ?? 'exito';
    
    $sql = "INSERT INTO registros (accion, tipo, detalles, usuario_id, estado) 
            VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssis", $accion, $tipo, $detalles, $usuario_id, $estado);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
    } else {
        echo json_encode(["success" => false, "error" => $conn->error]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Obtener registros del sistema
    $sql = "SELECT r.*, u.nombre as usuario_nombre 
            FROM registros r 
            LEFT JOIN usuarios u ON r.usuario_id = u.id 
            ORDER BY r.fecha DESC 
            LIMIT 50";
    $result = $conn->query($sql);
    
    $registros = [];
    while($row = $result->fetch_assoc()) {
        $registros[] = $row;
    }
    
    echo json_encode($registros);
}

$conn->close();
?>
