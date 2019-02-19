project('testapp')

gnome = import('gnome')

gnome.compile_resources('app', 'app.gresource.xml', gresource_bundle: true,
    install: true, install_dir: 'share/testapp')

install_data('app.js', install_dir: 'share/testapp')
install_data('cog.js', install_dir: 'bin')
