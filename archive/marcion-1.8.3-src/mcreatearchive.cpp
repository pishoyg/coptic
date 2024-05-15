/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "mcreatearchive.h"
#include "ui_mcreatearchive.h"

MCreateArchive::MCreateArchive(QString const & name,
                               QString const & path,
                               QWidget *parent) :
    QDialog(parent),
    items(),
    ui(new Ui::MCreateArchive),
    tgz_path(),
    popup()
{
    ui->setupUi(this);
    setWindowTitle(windowTitle()+" | "+name);

    ui->wdgDir->init(m_msg(),tr("directory"),QDir(path),false);
    ui->wdgDir->setRelativeToLibrary(true);

    ui->treeFiles->header()->setResizeMode(QHeaderView::ResizeToContents);

    a_expand_all=popup.addAction(tr("expand all"));
    a_collapse_all=popup.addAction(tr("collapse all"));
}

MCreateArchive::~MCreateArchive()
{
    delete ui;
}

void MCreateArchive::on_btExamine_clicked()
{
    USE_CLEAN_WAIT
    ui->treeFiles->clear();
    items.clear();
    tgz_path=ui->wdgDir->relativeToLibrary(ui->wdgDir->targetDir(),true);
    if(QDir(tgz_path).isAbsolute()||!MFileChooser::isInMLib(tgz_path))
    {
        QMessageBox mb(QMessageBox::Warning,windowTitle(),tr("Chosen directory cannot be translated as relative to Marcion's library. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
        if(mb.exec()==QMessageBox::Cancel)
        {
            tgz_path.clear();
            return;
        }
    }
    QString d(tgz_path);
    m_msg()->MsgMsg(tr("scanning directory '")+d+"' ...");

    QFileInfo fi(d);
    QString dnam(fi.fileName()),dpath(fi.filePath());

    unsigned int itc(0);
    struct stat st;
    int statr=stat(dpath.toUtf8().data(), &st);
    MCrArItem * i(new MCrArItem());
    i->_name=dnam;
    i->_path=dpath;
    if(statr==-1)
        i->_err=true;
    else
    {
        i->_size=st.st_size;
        i->_perm=st.st_mode;
        itc++;
    }
    i->setText();
    items.append(i);

    readdir(QDir(d),i,itc);
    ui->treeFiles->addTopLevelItem(i);


    m_msg()->MsgMsg(tr("items found: ")+QString::number(itc));
    m_msg()->MsgOk();
}

void MCreateArchive::readdir(QDir directory, MCrArItem * item,unsigned int & itc)
{
    item->setIcon(0,QIcon(":/new/icons/icons/folder.png"));

    QFileInfoList fl=directory.entryInfoList(QDir::Dirs|QDir::Files|QDir::NoDotAndDotDot,QDir::Name|QDir::DirsFirst);

    struct stat st;

    for(int x=0;x<fl.count();x++)
    {
        QFileInfo fi(fl.at(x));
        QString dnam(fi.fileName()),dpath(fi.filePath());

        int statr=stat(dpath.toUtf8().data(), &st);

        MCrArItem * i(new MCrArItem());

        i->_name=dnam;
        i->_path=dpath;
        if(statr==-1)
            i->_err=true;
        else
        {
            i->_size=st.st_size;
            i->_perm=st.st_mode;
            itc++;
        }

        i->setText();

        item->addChild(i);
        items.append(i);

        if(fi.isDir())
            readdir(QDir(fi.filePath()),i,itc);
    }
}

void MCreateArchive::on_btRmSel_clicked()
{
    QList<QTreeWidgetItem*> si=ui->treeFiles->selectedItems();
    for(int x=0;x<si.count();x++)
    {
        QTreeWidgetItem * i(si.at(x));
        if(i->parent())
        {
            items.removeOne((MCrArItem*)i);
            i->parent()->removeChild(i);
            delete i;
        }
        else
        {
            ui->treeFiles->clear();
            items.clear();
        }
    }
}

void MCreateArchive::on_treeFiles_customContextMenuRequested(QPoint )
{
    QAction *a(popup.exec(QCursor::pos()));
    if(a)
    {
        if(a==a_expand_all)
            ui->treeFiles->expandAll();
        else if(a==a_collapse_all)
            ui->treeFiles->collapseAll();
    }
}

// MCrArItem

MCrArItem::MCrArItem()
    :
      QTreeWidgetItem(QTreeWidgetItem::UserType),
      _name(),_path(),_strmode(),
      _perm(0),_size(0),
      _err(false)
{

}

void MCrArItem::setText()
{
    QTreeWidgetItem::setText(0,_name);
    QTreeWidgetItem::setToolTip(0,_path);
    if(_err)
    {
        QTreeWidgetItem::setText(1,"ERR");
        QTreeWidgetItem::setText(2,"N/A");
        QTreeWidgetItem::setToolTip(2,"N/A");
        QTreeWidgetItem::setText(3,"-");
    }
    else
    {
        QString tp("ignored");
        if(S_ISDIR(_perm))
            tp="dir";
        else if(S_ISREG(_perm))
            tp="file";
#ifndef Q_WS_WIN
        else if(S_ISLNK(_perm))
            tp="link";
#endif
        QTreeWidgetItem::setText(1,tp);
        QTreeWidgetItem::setText(2,CTranslit::humRead((qint64)_size));
        QTreeWidgetItem::setToolTip(2,QString(QString::number(_size)+" B"));
        if(_strmode.isEmpty())
            QTreeWidgetItem::setText(3,QString::number(_perm));
        else
            QTreeWidgetItem::setText(3,_strmode);
    }
}
