<?php

$commands = [];

$file = fopen('./commands.txt', 'r');
while ($line = fgets($file)) {
    // echo $line . '<br>';
    $code = trim(strtolower(substr($line, 0, 2)));
    $command = trim(substr($line, 2));
    // echo $code . ' ' . $command . '<br>';
    $commands[$code] = $command;
}
fclose($file);

// var_dump($commands);
// foreach ($commands as $co => $cd) {
//     echo $co . ' ' . $cd . '<br>';
// }