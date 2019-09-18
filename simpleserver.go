package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
)

const (
	DEFAULT_PORT      int    = 8000
	DEFAULT_HOST      string = "0.0.0.0"
	DEFAULT_DIRECTORY string = "."
)

var (
	PORT      int    = DEFAULT_PORT
	HOST      string = DEFAULT_HOST
	DIRECTORY string = DEFAULT_DIRECTORY
)

// Adapter wraps an http.Handler with additional
// functionality.
type Adapter func(http.Handler) http.Handler

// Adapt h with all specified adapters.
func Adapt(h http.Handler, adapters ...Adapter) http.Handler {
	for _, adapter := range adapters {
		h = adapter(h)
	}
	return h
}

// Simple logger
func Logging(l *log.Logger) Adapter {
	return func(h http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			l.Println(r.Method, r.URL.Path)
			h.ServeHTTP(w, r)
		})
	}
}

func main() {
	flag.StringVar(&DIRECTORY, "d", DEFAULT_DIRECTORY, "directory")
	flag.StringVar(&HOST, "h", DEFAULT_HOST, "server host")
	flag.IntVar(&PORT, "p", DEFAULT_PORT, "server port")
	flag.Parse()

	log.Println(DIRECTORY)

	logger := log.New(os.Stdout, "", log.LstdFlags)

	fmt.Printf("Serving HTTP on %v port %v\n", HOST, PORT)
	http.Handle("/", Adapt(http.FileServer(http.Dir(DIRECTORY)), Logging(logger)))
	err := http.ListenAndServe(fmt.Sprintf("%v:%v", HOST, PORT), nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
