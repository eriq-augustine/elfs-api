require 'fileutils'
require 'open3'
require 'shellwords'

OUT_DIR = 'dist'
OUT_CSS_CONCAT_PATH = File.join(OUT_DIR, 'filebrowser.css')
OUT_JS_CONCAT_PATH = File.join(OUT_DIR, 'filebrowser.js')
OUT_JS_ES5_PATH = File.join(OUT_DIR, 'filebrowser.es5.js')
OUT_JS_MIN_PATH = File.join(OUT_DIR, 'filebrowser.min.js')
OUT_JS_ES5_MIN_PATH = File.join(OUT_DIR, 'filebrowser.es5.min.js')

BABEL_PATH = File.join('/', 'home', 'eriq', 'node_modules', '.bin', 'babel')
MINIFY_PATH = File.join('/', 'home', 'eriq', 'node_modules', '.bin', 'minify')

JS_FILES = [
   './vendor/tablesorter/jquery.tablesorter.min.js',
   './vendor/videojs/video.js',
   './vendor/jquery-binarytransport/jquery.binarytransport.js',
   './vendor/zipjs/zip.js',
   './vendor/untar/untar.js',
   './vendor/galleria/galleria-1.5.7.js',
   './vendor/galleria/themes/classic/galleria.classic.modified.js',
   './vendor/tingle/tingle.min.js',
   './js/util.js',
   './js/model.js',
   './js/cache.js',
   './js/filetypes.js',
   './js/archive.js',
   './js/nav.js',
   './js/view.js',
   './js/init.js'
]

CSS_FILES = [
   './vendor/galleria/themes/classic/galleria.classic.css',
   './vendor/videojs/video-js.css',
   './vendor/tingle/tingle.min.css',
   './vendor/loading/boxes.css',
   './css/filebrowser.css',
   './css/tablesorter_theme/style.css'
]

COPY_FILES = [
   './css/tablesorter_theme/asc.gif',
   './css/tablesorter_theme/bg.gif',
   './css/tablesorter_theme/desc.gif',
   './vendor/galleria/themes/classic/classic-loader.gif',
   './vendor/galleria/themes/classic/classic-map.png'
]

def process(paths, outPath, es5 = true, minify = true)
   File.open(outPath, 'w'){|outFile|
      if (paths.size() == 0)
         return
      end

      paths.each{|path|
         data = IO.read(path)

         if (es5)
            command = [
               BABEL_PATH,
               '--no-babelrc',
               '-D'
            ]
            data, _ = run(Shellwords.join(command), data)
         end

         if (minify)
            command = [
               MINIFY_PATH,
            ]
            data, _ = run(Shellwords.join(command), data)
         end

         outFile.puts(data)
         outFile.puts()
      }
   }
end

def run(command, input = nil)
   if (input == nil)
      input = ''
   end

   stdout, stderr, status = Open3.capture3(command, :stdin_data => input)

   if (status.exitstatus() != 0)
      raise "Failed to run command: [#{command}]. Exited with status: #{status}" +
            "\n--- Stdout ---\n#{stdout}" +
            "\n--- Stderr ---\n#{stderr}"
   end

   return stdout, stderr
end

def main(args)
   FileUtils.mkdir_p(OUT_DIR)

   COPY_FILES.each{|path|
      FileUtils.cp(path, OUT_DIR)
   }

   process(CSS_FILES, OUT_CSS_CONCAT_PATH, false, false)

   process(JS_FILES, OUT_JS_CONCAT_PATH, false, false)
   process(JS_FILES, OUT_JS_ES5_PATH, true, false)
   process(JS_FILES, OUT_JS_MIN_PATH, false, true)
   process(JS_FILES, OUT_JS_ES5_MIN_PATH, true, true)
end

if ($0 == __FILE__)
   main(ARGV)
end
