<?php
/* $servername = "localhost";
$username = "root";
$password = "";
$dbname = "tecnoacceso";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}*/
// Configuración para AwardSpace
$servername = "fdb1034.awardspace.net";
$username = "4705410_tecnoacceso";
$password = "luch42611";
$dbname = "4705410_tecnoacceso";
$port = 3306;

$conn = new mysqli($servername, $username, $password, $dbname, $port);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}
?>
