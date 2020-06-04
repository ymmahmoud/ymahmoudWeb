<?php

/**
 * Class types
 * links parameter types with mysql types
 */

class config
{
    private function __construct() {
        $usepath = "";
        if (isset($GLOBALS['path'])) {
            $usepath = $GLOBALS['path'];
            unset($GLOBALS['path']);
        }
        $config_file_contents = file_get_contents($usepath."includes/config.json");
        if (!$config_file_contents) {
            exit();
        }
        $this->configured = json_decode($config_file_contents);
    }
    public static function get_config() {
        if (!isset(self::$instance)){
            self::$instance = new config();
        }
        return self::$instance;
    }
    public static function get_tablename() {
        return self::get_config()->configured->{"db_tablename"};
    }
    public static function get_params() {
        return self::get_config()->configured->{"user_parameters"};
    }
    public static function get_required() {
        return self::get_config()->configured->{"required"};
    }
    public static function get_ranks() {
        return self::get_config()->configured->{"ranks"};
    }


    private static $instance;
    public $configured;
}

class db_connect {
    private function __construct() {
        $config = config::get_config();
        $this->db = new mysqli(
            $config->configured->{"db_servername"},
            $config->configured->{"db_username"},
            $config->configured->{"db_password"},
            config::get_tablename()
        );
        if (!$this->db) {
            die("Could not connect to database");
        }
    }
    public static function getdb() {
        if (!isset(self::$instance)){
            self::$instance = new db_connect();
        }
        return self::$instance;
    }

    public static function getdbPdo() {
        $config = config::get_config();
        return new PDO(
           'mysql:host='. $config->configured->{"db_servername"} .';port=3306;dbname=' . config::get_tablename(),
            $config->configured->{"db_username"},
            $config->configured->{"db_password"}
        );
    }

    public static $instance;
    public $db;

}

function connect_to_database() {
    return db_connect::getdb()->db;
}

class user {
    public function __construct()
    {

    }
    private static function construct() {
        if (!isset($_SESSION['user'])) {
            self::$instance = new user();
            $_SESSION['user'] = self::$instance;
        } else {
            self::$instance = $_SESSION['user'];
        }
    }
    public static function get_user_by_id($id,&$class) {
        try {
            $db = connect_to_database();
            $stmt = $db->prepare("SELECT * FROM users WHERE id=?");
            $stmt->bind_param("s", $id);
            $stmt->execute();

            $user = $stmt->get_result();
            if (mysqli_num_rows($user) != 1) {
                return false;
            }
            $user_values = mysqli_fetch_assoc($user);

            foreach ($user_values as $key => $value) {
                $class->$key = $value;
            }

            $class->fetch_ranks_from();
            return true;

        } catch (Exception $e) {
            echo $e;
            exit;
        }
        return false;
    }
    public static function get_user_by_username($username,&$class) {
        try {
            $db = connect_to_database();
            $stmt = $db->prepare("SELECT * FROM users WHERE username=?");
            $stmt->bind_param("s", $username);
            $stmt->execute();

            $user = $stmt->get_result();
            if (mysqli_num_rows($user) != 1) {
                return false;
            }
            $user_values = mysqli_fetch_assoc($user);

            foreach ($user_values as $key => $value) {
                $class->$key = $value;
            }

            $class->fetch_ranks_from();
            $class->logged_in = true;
            return true;

        } catch (Exception $e) {
            echo $e;
            exit;
        }
    }

    private function fetch_ranks_from() {
        $db = connect_to_database();
        $stmt = $db->prepare("SELECT * FROM ranks WHERE user_id=?");
        $stmt->bind_param("s",$this->id);
        $stmt->execute();
        $res = $stmt->get_result();
        $ranks = config::get_ranks();
        while ($row = mysqli_fetch_assoc($res)) {
            $this->find_ranks_to($ranks,$row['rank_id'],$this->total_ranks);
        }


    }
    private function find_ranks_to($ranks, $rank,&$returnarray) {
        if (is_object($ranks)) {
            $return = false;
            foreach($ranks as $x=>$v) {
                if ($x == $rank) {
                    $returnarray[$x] = true;
                    $this->actual_ranks[$x] = true;
                    $return = true;
                } else {
                    $returnarray[$x] = false;
                    if ($this->find_ranks_to($v,$rank,$returnarray)) {

                        $returnarray[$x] = true;
                        $return = true;

                    }
                    if ($x == $rank) {

                        $returnarray[$x] = true;
                        $return = true;

                    }


                }
            }
            return $return;
        } else {
            return false;
        }
    }

    public function has_rank($rank) {
        if (!isset($this->total_ranks[$rank])) {
            return false;
            die("something went wrong");
        }
        if ($this->total_ranks[$rank]) {
            return true;
        }
        return false;
    }

    public static function has_permission($rank) {
        if (!isset(self::$instance)){
            self::construct();
        }
        if (!self::$instance->logged_in) {
            return false;
        }
        return self::$instance->has_rank($rank);
    }

    public function add_rank($rank) {

        $user = $this;
        if (!self::get_user_by_id($this->id,$user)) {
            return false;
        }
        if ($user->has_rank($rank)) {
            return false;
        }
        $db = connect_to_database();
        $stmt = $db->prepare("INSERT INTO ranks (user_id,rank_id) VALUES (?,?)");
        $stmt->bind_param("ss",$this->id,$rank);
        return $stmt->execute();

    }

    public function remove_rank($rank) {

        $user = $this;
        if (!self::get_user_by_id($this->id,$user)) {
            return false;
        }
        if (!$user->has_rank($rank)) {
            return false;
        }
        $db = connect_to_database();
        $stmt = $db->prepare("DELETE FROM ranks WHERE user_id=? AND rank_id=?");
        $stmt->bind_param("ss",$this->id,$rank);
        return $stmt->execute();
    }
    public static function create_account(&$post,&$error) {
        if (!isset(self::$instance)){
            self::construct();
        }
        $password_hash = password_hash($post['password'],PASSWORD_BCRYPT);
        $db = connect_to_database();
        $username = $post['username'];
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
        if (!$stmt) {
            $error = "Error: select call failed";
            return false;
        }
        $stmt->bind_param("s",$username);
        if (!$stmt->execute()) {
            $error = "Execute db error";
            return false;
        }
        $existing_user = $stmt->get_result();
        $stmt->close();
        if (mysqli_num_rows($existing_user) > 0) {
            $error = "A user with that username already exists";
            return false;
        }
        $params = config::get_params();

        $params_copy = array();
        $required = config::get_required();
        $params_string = "";
        $params_questions = "";
        $i = 0;
        foreach ($params as $key => $value) {
            if (isset($post[$key])) {
                $comma = "";
                if ($i > 0) {
                    $comma = ",";
                }
                $params_string .= $comma.$key ;
                $params_questions .= $comma."?";
                $params_copy[$key] = &$post[$key];
            } else if (in_array($key,$required)) {
                $error = "A required field is missing";
                return false;
            }
            ++$i;
        }
        $params = $params_copy;
        $params["password"] = &$password_hash;
        $params_string.=",password";
        $params_questions.=",?";

        $stmt = $db->prepare("INSERT INTO users ($params_string) VALUES ($params_questions)");
        $params = array_merge(array(str_repeat('s', count($params))), array_values($params));
        call_user_func_array(array(&$stmt, 'bind_param'), $params);



        if (!$stmt) {
            $error ="Binding parameter failed";
            return false;

        }

        if (!$stmt->execute()) {
            $error = "Database error";
            echo mysqli_error($db);
            exit;
            return false;
        }

        return true;
    }
    public static function login($username,$password) {
        if (!isset(self::$instance)){
            self::construct();
        }
        if (!self::get_user_by_username($username,self::$instance)) {
            echo "Invalid";
            exit;
            return false;
        }
        if (!password_verify($password,self::$instance->password)) {
            return false;
        }
        self::$instance->logged_in = true;
        return true;

    }
    static public function get_val($param) {
        if (!isset(self::$instance)){
            self::construct();
        }
        return self::$instance->get_val_($param);
    }
    static public function set_val($param,$value) {
        if (!isset(self::$instance)){
            self::construct();
        }
        self::$instance->set_val_($param,$value);
    }
    public function get_val_($param) {
        return $this->{$param};
    }
    public function set_val_($param,$value) {
        try {
            $db = connect_to_database();
            $param = mysqli_real_escape_string($db,$param);
            $stmt = $db->prepare("UPDATE users SET {$param}=? WHERE id=?");
            $stmt->bind_param("ss",$value, $this->id);
            $stmt->execute();
            $this->{$param} = $value;
        } catch (Exception $e) {
            echo mysqli_error($db);
            die($e);
        }
    }

    public static function is_logged_in() {

        if (!isset(self::$instance)){
            self::construct();
        }
        if (self::$instance->logged_in == false) {

            return false;
        }
        return true;
    }

    public static function logout() {
        unset($_SESSION['user']);
        return true;
    }
    private static $instance;
    private $id;
    public $total_ranks = array();
    public $actual_ranks = array();
    private $logged_in = false;

}

