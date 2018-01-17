module.exports = {

  access(user,object,type) {

  // Validamos primero que el tipo de objeto sea válido
  // si el tipo no es valido arrojar un error
  if( type !== 'org' &&
    type !== 'orgunit' &&
    type !== 'user' &&
    type !== 'content' &&
    type !== 'group') {
    try { throw new Error('Invalid Object type. Usage: access(user,object,type)');
    } catch (e) {
      return e.name + ': ' + e.message;
    }
  };

  //    console.log('User: ----------');
  //    console.log(user);
  //    console.log('Object: ');
  //    console.log(object);

  // Tipos de objeto -----------------
  // 'org'        ===> Organización
  // 'orgunit'    ===> Unidad Organizacional
  // 'user'       ===> Usuario
  // 'content'  ===> Bloques, tareas, cuestionarios
  // 'group'     ===> Grupos, tares, cuestionarios, Grupos de discusión, evaluaciones, tracking

  // Checar si el usuario tiene rol isAdmin

  if(user.roles.isAdmin) {
    if(type === 'org' || type === 'orgunit' || type === 'user') {
      return {
        by: 'admin',
        canRead: true,
        canModify: true,
        canSec: true
      }
    }
  };

  // Checar si el usuario tiene rol isBusiness

  if(user.roles.isBusiness) {
    if(type === 'org' || type === 'orgunit' || type === 'user'  || type === 'content'  || type === 'group') {
      var returnObj = {
        by: 'business',
        canRead: true,
        canModify: false,
        canSec: false
      };
      if(type === 'content') { returnObj.canModify = true };
      return returnObj;
    };
  };


  // Checar acceso al objeto con permiso para usuario
  // ---------------------------------------
    var users = object.perm.users;
    var foundUser = users.find(x => x.name === user.name); // buscamos los accesos del usuario
    if(foundUser) {
      var returnObj =  {
        by: 'user',
        canRead: foundUser.canRead,
        canModify: foundUser.canModify
      };
      switch (type) {
        case 'org':
          returnObj.canSec = false;
        break;
        case 'orgunit':
          returnObj.canSec = false;
        break;
        case 'user':
          returnObj.canSec = false;
        break;
        default:
          returnObj.canSec = foundUser.canSec;
      };
      return returnObj;
    };
    // No se encontraron accesos por usuario

    // Buscamos accesos por roles
    //
    //  rol 'isOrg'
    //
    // Buscamos accesos por Organización y que el usuario tenga el rol de isOrg
    // O que el usuario sea isAdmin

    var orgs = object.perm.orgs;
    var roles = object.perm.roles;

    // Rol a buscar: isOrg
    // isOrg puede:
    // Leer:
    //      - Objeto tipo 'org' al que pertenece
    //      - Objetos tipo 'orgUnit' de la organización a la que pertenece
    //      - Objetos tipo 'user' de la organización a la que pertenecen
    // Modificar:
    //      - Objeto tipo 'org' al que pertenece
    //      - Objetos tipo 'orgUnit' de la organización a la que pertenece
    //      - Objetos tipo 'user' de la organización a la que pertenece

    var foundOrg = orgs.find(x => x.name === user.org);
    // Vamos a buscar a qué tiene derecho el usuario sobre su organizacion
    if(foundOrg) {
      // si encontramos la org del usuario en el objeto, entonces checamos si el usuario tiene rol de isOrg
      var foundRole = roles.find(x => x.name === 'isOrg'); // Objeto tiene isOrg
      if(foundRole){
        if(user.roles.isOrg && (type === 'org' || type === 'orgunit' || type === 'user')) {
          var returnObj = {
            by: 'org',
            canRead: foundRole.canRead,
            canModify: foundRole.canModify,
            canSec: false
          };
          if(type === 'orgunit' || type === 'user') {returnObj.canSec = true };
          return returnObj;
        };
      };

      // Rol a buscar: isOrgContent
      // isOrgContent puede:
      // Leer:
      //      - Objeto tipo 'org' al que pertenece
      //      - Objetos tipo 'orgUnit' de la organización a la que pertenece
      //      - Objetos tipo 'user' de la organización a la que pertenece
      //      - Objetos tipo 'content' de la organización a la que pertenece
      //      - Objetos tipo 'group' de la organización a la que pertenece
      // Modificar:
      //      - Objetos tipo 'group' de la organización a la que pertenece
      // Seguridad:
      //      - Objetos tipo 'content' de la organización a la que pertenece

      foundRole = roles.find(x => x.name === 'isOrgContent'); // Objeto tiene isOrgContent
      if(foundRole) {
        var returnObj = {
          by: 'orgContent',
          canRead: foundRole.canRead,
          canModify: false,
          canSec: false
        };
        if(user.roles.isOrgContent) {
          if(type === 'content' || type === 'group') { returnObj.canSec = true };
          if(type === 'group') { returnObj.canModify = true };
        };
        return returnObj;
      };

      // Rol a buscar: isAuthor
      // isAuthor puede:
      // Leer:
      //      - Objeto tipo 'org' al que pertenece
      //      - Objetos tipo 'orgUnit' de la organización a la que pertenece
      //      - Objetos tipo 'content' de la organización a la que pertenece
      //      - Objetos tipo 'group' de la organización a la que pertenece
      // Modificar:
      //      - Objetos tipo 'content' de la organización a la que pertenece
      // Seguridad:
      //      - Objetos tipo 'content' de la organización a la que pertenece

      foundRole = roles.find(x => x.name === 'isAuthor'); // Objeto tiene isAuthor
      if(foundRole && (type === 'org' || type === 'orgUnit' || type === 'content' || type === 'group')) {
        if(user.roles.isAuthor) {
          var foundOrgUnit = orgunits.find(x => x.name === user.orgUnit);
          if(foundOrgUnit){
            var returnObj = {
              by: 'author',
              canRead: foundRole.canRead,
              canModify: false,
              canSec: false
            };
            if(type === 'content') {
              returnObj.canModify = foundRole.canModify;
              returnObj.canModify = foundRole.canSec;
            };
            return returnObj;
          };
        };
      };


      // Rol a buscar: isInstructor
      // isInstructor puede:
      // Leer:
      //      - Objeto tipo 'org' al que pertenece
      //      - Objetos tipo 'orgUnit' de la organización a la que pertenece
      //      - Objetos tipo 'user' de la organizacion a la que pertenece
      //      - Objetos tipo 'content' de la organización a la que pertenece
      //      - Objetos tipo 'group' de la organización a la que pertenece
      // Modificar:
      //      - Objetos tipo 'group' que isInstructor ha creado
      // Seguridad:
      //      - Objetos tipo 'content' que isInstructor ha creado

      foundRole = roles.find(x => x.name === 'isInstructor'); // Objeto tiene isInstructor
      if(foundRole && (type === 'org' || type === 'orgUnit' || type === 'user' || type === 'content' || type === 'group')) {
        if(user.roles.isInstructor) {
          var returnObj = {
            by: 'instructor',
            canRead: foundRole.canRead,
            canModify: false,
            canSec: false
          };
          return returnObj;
        };
      };


      // Rol a buscar: isSupervisor
      // isSupervisor puede:
      // Leer:
      //      - Objeto tipo 'org' al que pertenece
      //      - Objetos tipo 'orgUnit' de la organización a la que pertenece
      //      - Objetos tipo 'user' de la organizacion a la que pertenece
      //      - Objetos tipo 'content' de la organización a la que pertenece
      //      - Objetos tipo 'group' de la organización a la que pertenece
      // Modificar:
      //      - Objetos tipo 'group' que isSupervisor ha creado
      // Seguridad:
      //      - Objetos tipo 'content' de isSupervisor ha creado

      foundRole = roles.find(x => x.name === 'isSupervisor'); // Objeto tiene isInstructor
      if(foundRole && (type === 'org' || type === 'orgUnit' || type === 'user' || type === 'content' || type === 'group')) {
        if(user.roles.isSupervisor) {
          var returnObj = {
            by: 'supervisor',
            canRead: foundRole.canRead,
            canModify: false,
            canSec: false
          };
          if(type === 'group') {
            returnObj.canModify = foundRole.canModify;
            returnObj.canSec = foundRole.canSec;
          };
          return returnObj;
        };
      };

    }; // Termina la revisión de la organización
  return {
    by: 'none',
    canRead: false,
    canModify: false,
    canSec: false
  };
  } // termina la funcion access

};
