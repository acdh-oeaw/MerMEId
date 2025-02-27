xquery version "3.1";

import module namespace request="http://exist-db.org/xquery/request";
import module namespace config="https://github.com/edirom/mermeid/config" at "../modules/config.xqm";
import module namespace xmldb="http://exist-db.org/xquery/xmldb";

declare namespace xs="http://www.w3.org/2001/XMLSchema";
declare option exist:serialize "method=xml encoding=UTF-8 media-type=text/html";

let $method      := request:get-method()
let $data        := request:get-data()

(:let $log-in      := login:function():)
let $exist_path  := request:get-parameter("path","")
let $transform   := if(true()) then
    xs:anyURI("xsl/filter_put.xsl")
else
    xs:anyURI("xsl/null_transform.xsl")
let $op          := doc($transform)
let $params      := <parameters/>
let $tdoc        := transform:transform($data,$op,$params)

let $file        := replace($exist_path, "/*","")
let $result      := if($file and $tdoc) then
    xmldb:store($config:data-root, $file , $tdoc)
else
    ()

return
<html>
<head><title>script for saving things to database</title></head>
<body>
<h1>script for checking things</h1>
<p>uri {request:get-uri()}</p>
<table>
<tr><td>parameter</td><td>value</td></tr>
{
   for $par in request:get-parameter-names() 
	return <tr><td>{xs:string($par)}</td><td>{request:get-parameter($par,"")}</td></tr>
}
<tr><td>my method</td><td>{$method}</td></tr>
<tr><td>saving file</td><td>{$file}</td></tr>
</table>
</body>
</html>