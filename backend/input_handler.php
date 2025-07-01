<?php

require_once 'commands.php';

function returnToMain(string $message) {
    echo $message . '<br>';
    header('Location: ../index.php');
}

if (isset($_POST['code']) && $_POST['code'] != '') {
    // $code = trim(strtolower($_POST['code']));
    // if (array_key_exists($code, $commands)) {
    //     echo $commands[$code] . '<br>';
    // }
    // else {
    //     // returnToMain('No such code<br>');
    //     echo $code . ' nigga<br>';
    // }
}

if (isset($_POST['command'])) {
    $command = trim($_POST['command']);
    if (in_array($command, $commands)) {
        echo $command . '<br>';
    } else {
        // returnToMain('No such command');
    }
}