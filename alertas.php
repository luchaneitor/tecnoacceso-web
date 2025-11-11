<?php
include 'db.php';
header("Content-Type: application/json");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Obtener alertas no leídas
    $sql = "SELECT a.*, u.nombre as usuario_nombre 
            FROM alertas a 
            LEFT JOIN usuarios u ON a.usuario_id = u.id 
            WHERE a.leida = 0 
            ORDER BY a.fecha DESC 
            LIMIT 10";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        echo json_encode(["error" => $conn->error]);
        exit;
    }
    
    $alertas = [];
    while($row = $result->fetch_assoc()) {
        $alertas[] = $row;
    }
    
    echo json_encode($alertas);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Crear nueva alerta
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(["success" => false, "error" => "JSON inválido"]);
        exit;
    }
    
    $mensaje = $data['mensaje'] ?? '';
    $tipo = $data['tipo'] ?? 'info';
    $prioridad = $data['prioridad'] ?? 'media';
    $usuario_id = $data['usuario_id'] ?? NULL;
    
    if (empty($mensaje)) {
        echo json_encode(["success" => false, "error" => "Mensaje vacío"]);
        exit;
    }
    
    $sql = "INSERT INTO alertas (mensaje, tipo, prioridad, usuario_id) 
            VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        echo json_encode(["success" => false, "error" => $conn->error]);
        exit;
    }
    
    $stmt->bind_param("sssi", $mensaje, $tipo, $prioridad, $usuario_id);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
    } else {
        echo json_encode(["success" => false, "error" => $stmt->error]);
    }
    
    $stmt->close();
} else {
    echo json_encode(["error" => "Método no permitido"]);
}

$conn->close();
?>